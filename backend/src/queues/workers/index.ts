import { Worker } from 'bullmq';
import { connection } from '../queues';
import { processSourcing } from './sourcing.worker';
import { processOutreach } from './outreach.worker';
import { handleInboundReply } from '../../services/replies.service';
import { patchCard } from '../../services/messages.service';

export function startWorkers() {
  // Jobs resume safely after a crash or restart, so allow a few stalls before giving up.
  const opts = { connection, maxStalledCount: 3 };
  const sourcing = new Worker('sourcing', processSourcing, { ...opts, concurrency: 2 });
  sourcing.on('failed', async (job, err) => {
    // Show the error only when BullMQ has given up (retries used up, or stalled too often), not on a retry.
    if (job && (await job.isFailed())) await patchCard(job.data.messageId, { done: true, error: err.message });
  });
  const outreach = new Worker('outreach', processOutreach, { ...opts, concurrency: 5 });
  const reply = new Worker('reply', (job) => handleInboundReply(job.data.candidateId, job.data.body), opts);
  for (const w of [sourcing, outreach, reply]) w.on('failed', (job, err) => console.error(`[${w.name}] job ${job?.id} failed: ${err.message}`));
  return [sourcing, outreach, reply];
}
