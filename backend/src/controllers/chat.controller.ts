import { z } from 'zod';
import { ah, validate } from '../middleware/errors';
import { Message } from '../models/Message';
import { runAgent } from '../agent/agent';
import { applyCardAction } from '../services/actions.service';
import { postMessage } from '../services/messages.service';
import { publish } from '../services/events';

const GREETING = "Hi! I'm your recruiting co-worker. Paste a job description or send me a link to one, and I'll set up the job, find candidates, run outreach and keep track of everyone through to hire.";

const ACTIVE = { archived: { $ne: true } };

export const listMessages = ah(async (_req, res) => {
  if (!(await Message.exists(ACTIVE))) await postMessage('assistant', GREETING);
  res.json(await Message.find(ACTIVE).sort({ createdAt: 1 }).lean());
});

/** Starts a new chat. Jobs, candidates and activity are untouched. */
export const clearChat = ah(async (_req, res) => {
  await Message.updateMany(ACTIVE, { archived: true });
  publish({ type: 'chat_cleared' });
  await postMessage('assistant', GREETING);
  res.json(await Message.find(ACTIVE).sort({ createdAt: 1 }).lean());
});

export const sendChat = ah(async (req, res) => {
  const { text } = validate(z.object({ text: z.string().trim().min(1).max(20_000) }), req.body);
  res.json(await runAgent(text));
});

export const cardAction = ah(async (req, res) => {
  const { action, data } = validate(z.object({ action: z.enum(['confirm', 'cancel']), data: z.record(z.string(), z.unknown()).optional() }), req.body);
  res.json(await applyCardAction(req.params.id, action, data));
});
