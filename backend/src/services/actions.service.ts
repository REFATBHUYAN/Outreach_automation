import { z } from 'zod';
import { Message } from '../models/Message';
import { Job } from '../models/Job';
import { Candidate } from '../models/Candidate';
import { HttpError } from '../middleware/errors';
import { cards } from '../views/cards';
import { postMessage } from './messages.service';
import { changeStatus, logActivity } from './candidates.service';
import { approveCampaign, setCampaignStatus, updateDrafts } from './campaigns.service';
import { sendReply } from './replies.service';
import { sourcingQueue, type SourcingData } from '../queues/queues';
import { generateQueries } from './ai.service';
import { publish } from './events';

const BY = { actor: 'recruiter', via: 'chat' } as const;
const jobInput = z.object({
  title: z.string().min(1), description: z.string().optional(), mustHave: z.array(z.string()), niceToHave: z.array(z.string()),
  seniority: z.string().optional(), location: z.string().optional(), salary: z.string().optional(), remotePolicy: z.string().optional(),
});
const draftsInput = z.array(z.object({ candidateId: z.string(), step: z.number(), subject: z.string(), body: z.string() })).optional();

export async function startSourcing(jobId: string, opts: { queries?: string[]; useWeb?: boolean; rescoreOnly?: boolean; rows?: SourcingData['rows'] }) {
  const progress = await postMessage('assistant', '', cards.sourcingProgress(jobId), jobId);
  await sourcingQueue.add('source', { jobId, messageId: String(progress._id), ...opts });
  return progress;
}

/** After a job is created: AI writes search queries and asks before sourcing. Falls back to one simple query. */
export async function proposeSourcing(job: InstanceType<typeof Job>) {
  const jobId = String(job._id);
  const fallback = [`site:linkedin.com/in "${job.title}" ${[...job.mustHave.slice(0, 2), job.location].filter(Boolean).map((t) => `"${t}"`).join(' ')}`.trim()];
  const queries = await generateQueries(job, jobId).catch(() => fallback);
  await Job.updateOne({ _id: jobId }, { searchQueries: queries });
  await postMessage('assistant', `Job "${job.title}" is ready. I wrote ${queries.length} search queries to find matching LinkedIn profiles — edit them if you like, then start sourcing. Everyone found is deduplicated and scored against the job.`,
    cards.sourcingConfirm(jobId, queries), jobId);
}

type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
// What "Confirm" does for each card type. These are the only places agent-proposed writes happen.
const CONFIRM: Record<string, (d: Data) => Promise<Data | void>> = {
  job_confirm: async (d) => {
    const job = await Job.create(jobInput.parse(d));
    const jobId = String(job._id);
    await logActivity({ jobId, type: 'job', actor: 'recruiter', via: 'chat', note: `Job "${job.title}" created` });
    publish({ type: 'job', jobId });
    await proposeSourcing(job);
    return { jobId };
  },
  sourcing_confirm: async (d) => void (await startSourcing(d.jobId, { queries: z.array(z.string().min(1)).min(1).parse(d.queries), useWeb: d.useWeb !== false })),
  scoring_confirm: async (d) => void (await startSourcing(d.jobId, { rescoreOnly: true })),
  decision_confirm: async (d) => {
    const errors: string[] = [];
    for (const x of d.decisions as { candidateId: string; decision: 'accepted' | 'rejected' }[])
      await changeStatus(x.candidateId, x.decision, BY).catch((e: Error) => errors.push(e.message));
    if (errors.length) return { errors };
  },
  status_confirm: async (d) => void (await changeStatus(d.candidateId, d.to, { ...BY, note: d.note })),
  campaign_preview: async (d) => {
    const drafts = draftsInput.parse(d.drafts);
    if (drafts?.length) await updateDrafts(d.campaignId, drafts);
    await approveCampaign(d.campaignId);
  },
  reply_draft: async (d) => void (await sendReply(d.candidateId, z.string().min(1).parse(d.subject), z.string().min(1).parse(d.body), BY)),
};
const CANCEL: Record<string, (d: Data) => Promise<unknown>> = {
  campaign_preview: (d) => setCampaignStatus(d.campaignId, 'cancelled'),
  reply_draft: (d) => Candidate.updateOne({ _id: d.candidateId }, { pendingReply: null }),
};

/** Confirms or cancels a pending card. The status flip is atomic, so a double click cannot apply a write twice. */
export async function applyCardAction(messageId: string, action: 'confirm' | 'cancel', edits?: Data) {
  const msg = await Message.findById(messageId);
  if (!msg?.card?.type) throw new HttpError(404, 'Card not found');
  const type = msg.card.type;
  const data = { ...(msg.card.data as Data), ...edits };
  const claimed = await Message.findOneAndUpdate(
    { _id: messageId, 'card.status': 'pending' },
    { 'card.status': action === 'confirm' ? 'confirmed' : 'cancelled', 'card.data': data },
    { returnDocument: 'after' },
  );
  if (!claimed) throw new HttpError(409, 'This card was already handled');
  try {
    const extra = action === 'confirm' ? await CONFIRM[type]?.(data) : await CANCEL[type]?.(data);
    if (extra) claimed.set('card.data', { ...data, ...extra });
    await claimed.save();
  } catch (e) {
    await Message.updateOne({ _id: messageId }, { 'card.status': 'pending' }); // let them fix and retry
    throw e;
  }
  publish({ type: 'message', message: claimed });
  return claimed;
}
