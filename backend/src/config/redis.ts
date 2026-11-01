import IORedis from 'ioredis';
import { env } from './env';

// BullMQ requires maxRetriesPerRequest: null on connections used by workers.
export const createRedis = () => new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const redis = createRedis();
