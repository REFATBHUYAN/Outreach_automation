import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { router } from './routes';
import { errorHandler } from './middleware/errors';

export const app = express();
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', router);
app.use(errorHandler);
