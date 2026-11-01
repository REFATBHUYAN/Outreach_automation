import type { Job as BullJob } from 'bullmq';
import { Job } from '../../models/Job';
import { Candidate } from '../../models/Candidate';
import { dedupe } from '../../services/dedupe';
import { searchProfiles } from '../../services/search.service';
import { scoreCandidates } from '../../services/ai.service';
import { patchCard, postMessage } from '../../services/messages.service';
import { publish } from '../../services/events';
import { cards } from '../../views/cards';
import type { SourcingData } from '../queues';
import type { CandidateRow } from '../../services/csv';

const BATCH = 10;
const PARALLEL = 3; // scoring calls in flight at once

/** Several searches + CSV → dedupe → insert → score. Safe to retry: dedupe skips inserted rows, scoring resumes on unscored ones. */
export async function processSourcing(bull: BullJob<SourcingData>) {
  const { jobId, messageId, queries = [], useWeb, rows = [], rescoreOnly } = bull.data;
  const job = await Job.findById(jobId);
  if (!job) return;
  const notes: string[] = [];

  if (!rescoreOnly) {
    const incoming: (CandidateRow & { source: 'csv' | 'web' })[] = rows.map((r) => ({ ...r, source: 'csv' }));
    if (useWeb) {
      for (const [i, query] of queries.entries()) {
        const web = await searchProfiles(query, jobId);
        if (web.note) { notes.push(web.note); break; }
        incoming.push(...web.rows.map((r) => ({ ...r, query, source: 'web' as const })));
        notes.push(`Query ${i + 1}/${queries.length}: ${web.rows.length} profiles`);
        await patchCard(messageId, { found: incoming.length, notes });
      }
    }
    const existing = await Candidate.find({ jobId }, { email: 1, profileUrl: 1 }).lean();
    const fresh = dedupe(incoming, existing);
    if (fresh.length) await Candidate.insertMany(fresh.map((r) => ({ ...r, jobId, reached: { sourced: new Date() } })), { ordered: false });
    if (incoming.length > fresh.length) notes.push(`${incoming.length - fresh.length} duplicates removed`);
    await patchCard(messageId, { found: incoming.length, added: fresh.length, notes });
  }

  const toScore = await Candidate.find({ jobId, score: null });
  let scored = 0;
  const batches = Array.from({ length: Math.ceil(toScore.length / BATCH) }, (_, i) => toScore.slice(i * BATCH, (i + 1) * BATCH));
  for (let i = 0; i < batches.length; i += PARALLEL) {
    await Promise.all(batches.slice(i, i + PARALLEL).map(async (batch) => {
      const results = await scoreCandidates(job, batch.map((c) => ({ id: String(c._id), name: c.name, headline: c.headline, location: c.location, profileUrl: c.profileUrl, company: c.company, education: c.education, summary: c.summary })), jobId);
      await Promise.all(results.map((r) => Candidate.updateOne({ _id: r.id, jobId }, { score: r.score, reason: r.reason, skills: r.skills })));
      scored += batch.length;
      await patchCard(messageId, { scored, toScore: toScore.length });
      publish({ type: 'candidate', jobId, candidateId: '' });
    }));
  }

  await patchCard(messageId, { done: true });
  const total = await Candidate.countDocuments({ jobId });
  await postMessage(
    'assistant',
    total
      ? `Sourcing done — ${scored} candidates scored. Accept or reject each below, or tell me something like "accept the top 5".`
      : 'Sourcing finished but found no candidates. Upload a CSV or try a different search query.',
    total ? cards.candidateTable(jobId) : undefined,
    jobId,
  );
}
