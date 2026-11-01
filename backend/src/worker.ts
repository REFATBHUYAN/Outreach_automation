import { connectDb } from './config/db';
import { startWorkers } from './queues/workers';

connectDb().then(() => { startWorkers(); console.log('Workers started'); }).catch((e) => { console.error(e); process.exit(1); });
