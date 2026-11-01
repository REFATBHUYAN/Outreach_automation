import { Queue, type JobsOptions } from 'bullmq';
import { createRedis } from '../config/redis';
import type { CandidateRow } from '../services/csv';

export interface SourcingData { jobId: string; messageId: string; queries?: string[]; useWeb?: boolean; rows?: CandidateRow[]; rescoreOnly?: boolean }
export interface OutreachData { campaignId: string; candidateId: string; step: number }
export interface ReplyData { candidateId: string; body: string }

export const connection = createRedis();
// Every background job retries with exponential backoff.
const defaultJobOptions: JobsOptions = { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 1000, removeOnFail: 1000 };

export const sourcingQueue = new Queue<SourcingData>('sourcing', { connection, defaultJobOptions });
export const outreachQueue = new Queue<OutreachData>('outreach', { connection, defaultJobOptions });
export const replyQueue = new Queue<ReplyData>('reply', { connection, defaultJobOptions });

/** Deterministic job id: BullMQ ignores a second add with the same id, a first line of defence against double sends. */
export const enqueueStep = (d: OutreachData, delay = 0) =>
  outreachQueue.add('send', d, { delay, jobId: `${d.campaignId}-${d.candidateId}-${d.step}` });
