import { redis, createRedis } from '../config/redis';

// Workers and the API may run in different processes, so live events go through Redis pub/sub.
const CHANNEL = 'events';
export type AppEvent =
  | { type: 'message'; message: unknown }
  | { type: 'candidate'; jobId: string; candidateId: string }
  | { type: 'campaign'; jobId: string; campaignId: string }
  | { type: 'job'; jobId: string } // created or updated
  | { type: 'chat_cleared' };

export const publish = (e: AppEvent) => redis.publish(CHANNEL, JSON.stringify(e)).catch(() => undefined);

export function subscribe(onEvent: (raw: string) => void) {
  const sub = createRedis();
  sub.subscribe(CHANNEL);
  sub.on('message', (_c, raw) => onEvent(raw));
  return () => void sub.quit();
}
