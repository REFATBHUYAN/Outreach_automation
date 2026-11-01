import { Candidate } from '../models/Candidate';
import { Job } from '../models/Job';
import { env } from '../config/env';
import { classifyReply } from './ai.service';
import { changeStatus, logActivity, type Actor } from './candidates.service';
import { canTransition, type Status } from './pipeline';
import { canAutoSend, detectInjection, type ReplyClass } from './safety';
import { sendMail } from './mailer';
import { postMessage } from './messages.service';
import { publish } from './events';
import { cards } from '../views/cards';
import { HttpError } from '../middleware/errors';

const NEXT: Record<ReplyClass, Status | undefined> = {
  interested: 'interested', not_interested: 'not_interested', wants_meeting: 'meeting_booked', unsubscribe: 'unsubscribed', question: undefined,
};
const SYSTEM: Actor = { actor: 'ai', via: 'worker' };

export const bookingLink = (candidateId: string) => `${env.FRONTEND_URL}/book/${candidateId}`;

/** Handles one inbound reply: classify, update status (which stops follow-ups), draft a response. */
export async function handleInboundReply(candidateId: string, body: string) {
  const c = await Candidate.findById(candidateId);
  if (!c) return;
  const job = await Job.findById(c.jobId);
  if (!job) return;
  const flagged = detectInjection(body);
  c.thread.push({ direction: 'in', body, at: new Date() });
  c.flagged = c.flagged || flagged;
  await c.save();
  await logActivity({ jobId: c.jobId, candidateId: c._id, candidateName: c.name, type: 'reply_received', actor: 'system', via: 'worker', note: body.slice(0, 200) });
  if (c.status === 'contacted') await changeStatus(candidateId, 'replied', SYSTEM);

  const id = String(c._id);
  const r = await classifyReply(job, { id, name: c.name }, body, bookingLink(id), String(job._id));
  const fresh = (await Candidate.findById(candidateId))!;
  const next = NEXT[r.category];
  if (next && canTransition(fresh.status as Status, next)) await changeStatus(candidateId, next, { ...SYSTEM, note: `Reply classified as ${r.category}` });
  await Candidate.updateOne({ _id: candidateId }, { replyClass: r.category, pendingReply: r.category === 'unsubscribe' ? null : { subject: r.subject, body: r.body } });

  if (r.category === 'unsubscribe') return postMessage('assistant', `${c.name} unsubscribed. All outreach to them has stopped.`, undefined, String(job._id));
  if (job.autoReply && canAutoSend(r.category, flagged)) return sendReply(candidateId, r.subject, r.body, { actor: 'ai', via: 'worker', note: 'auto-reply' });
  return postMessage(
    'assistant',
    `${c.name} replied (${r.category.replace('_', ' ')}).${flagged ? ' ⚠ Their message looks like a prompt-injection attempt, so it was treated as plain text.' : ''} I drafted a response for your approval.`,
    cards.replyDraft({ candidateId: id, name: c.name, inbound: body, category: r.category, flagged, subject: r.subject, body: r.body }),
    String(job._id),
  );
}

export async function sendReply(candidateId: string, subject: string, body: string, by: Actor) {
  const c = await Candidate.findById(candidateId);
  if (!c?.email) throw new HttpError(400, 'Candidate has no email address');
  if (c.status === 'unsubscribed') throw new HttpError(409, 'Candidate unsubscribed');
  await sendMail(c.email, subject, body);
  c.thread.push({ direction: 'out', subject, body, at: new Date() });
  c.set('pendingReply', null);
  await c.save();
  await logActivity({ jobId: c.jobId, candidateId: c._id, candidateName: c.name, type: 'reply_sent', note: subject, ...by });
  publish({ type: 'candidate', jobId: String(c.jobId), candidateId });
}
