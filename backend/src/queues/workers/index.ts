import { Worker } from 'bullmq';
import { connection } from '../queues';
import { processSourcing } from './sourcing.worker';
import { processOutreach } from './outreach.worker';
import { handleInboundReply } from '../../services/replies.service';
import { patchCard, postMessage } from '../../services/messages.service';
import { logActivity } from '../../services/candidates.service';
import { Candidate } from '../../models/Candidate';

export function startWorkers() {
  // Jobs resume safely after a crash or restart, so allow a few stalls before giving up.
  const opts = { connection, maxStalledCount: 3 };
  const sourcing = new Worker('sourcing', processSourcing, { ...opts, concurrency: 2 });
  sourcing.on('failed', async (job, err) => {
    // Show the error only when BullMQ has given up (retries used up, or stalled too often), not on a retry.
    if (job && (await job.isFailed())) await patchCard(job.data.messageId, { done: true, error: err.message });
  });
  const outreach = new Worker('outreach', processOutreach, { ...opts, concurrency: 5 });
  outreach.on('failed', async (job, err) => {
    // A send that never succeeds must be visible, not leave the candidate silently "accepted".
    if (!job || !(await job.isFailed())) return;
    const c = await Candidate.findById(job.data.candidateId);
    if (!c) return;
    const note = `Email step ${job.data.step + 1} to ${c.email} failed: ${err.message}`;
    await logActivity({ jobId: c.jobId, candidateId: c._id, candidateName: c.name, type: 'email_failed', actor: 'system', via: 'worker', note });
    await postMessage('assistant', `⚠ ${c.name}: ${note}. Check SMTP_URL in backend/.env.`, undefined, String(c.jobId));
  });
  const reply = new Worker('reply', (job) => handleInboundReply(job.data.candidateId, job.data.body), opts);
  for (const w of [sourcing, outreach, reply]) w.on('failed', (job, err) => console.error(`[${w.name}] job ${job?.id} failed: ${err.message}`));
  return [sourcing, outreach, reply];
}
