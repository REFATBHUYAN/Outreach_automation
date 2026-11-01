import { Message } from '../models/Message';
import type { Card } from '../views/cards';
import { publish } from './events';

export async function postMessage(role: 'user' | 'assistant', text: string, card?: Card, jobId?: string) {
  const message = await Message.create({ role, text, card, jobId });
  publish({ type: 'message', message });
  return message;
}

/** Merges `patch` into a card's data and pushes the update to every open chat. */
export async function patchCard(messageId: string, patch: Record<string, unknown>) {
  const set = Object.fromEntries(Object.entries(patch).map(([k, v]) => [`card.data.${k}`, v]));
  const message = await Message.findByIdAndUpdate(messageId, { $set: set }, { returnDocument: 'after' });
  if (message) publish({ type: 'message', message });
  return message;
}
