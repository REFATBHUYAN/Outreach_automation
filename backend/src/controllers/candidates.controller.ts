import { z } from 'zod';
import { ah, HttpError, validate } from '../middleware/errors';
import { Candidate } from '../models/Candidate';
import { Job } from '../models/Job';
import { STATUSES } from '../services/pipeline';
import { changeStatus, logActivity } from '../services/candidates.service';
import { sendReply } from '../services/replies.service';
import { replyQueue } from '../queues/queues';
import { publish } from '../services/events';

/** Recruiter adds or fixes contact details (web search never returns emails). */
export const updateCandidate = ah(async (req, res) => {
  const { email } = validate(z.object({ email: z.string().trim().toLowerCase().email() }), req.body);
  const c = await Candidate.findById(req.params.id);
  if (!c) throw new HttpError(404, 'Candidate not found');
  c.email = email;
  try {
    await c.save();
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new HttpError(409, 'Another candidate for this job already has that email');
    throw e;
  }
  await logActivity({ jobId: c.jobId, candidateId: c._id, candidateName: c.name, type: 'contact_updated', actor: 'recruiter', via: 'ui', note: `Email set to ${email}` });
  publish({ type: 'candidate', jobId: String(c.jobId), candidateId: String(c._id) });
  res.json(c);
});

export const updateStatus = ah(async (req, res) => {
  const { status, note } = validate(z.object({ status: z.enum(STATUSES), note: z.string().max(1000).optional() }), req.body);
  res.json(await changeStatus(req.params.id, status, { actor: 'recruiter', via: 'ui', note }));
});

/** POST /simulate-reply — stands in for a real inbox. */
export const simulateReply = ah(async (req, res) => {
  const { candidateId, body } = validate(z.object({ candidateId: z.string(), body: z.string().trim().min(1).max(10_000) }), req.body);
  const c = await Candidate.findById(candidateId);
  if (!c) throw new HttpError(404, 'Candidate not found');
  if (!c.reached?.contacted) throw new HttpError(409, 'Only contacted candidates can reply');
  await replyQueue.add('reply', { candidateId, body });
  res.status(202).json({ queued: true });
});

export const approveReply = ah(async (req, res) => {
  const { subject, body } = validate(z.object({ subject: z.string().min(1), body: z.string().min(1) }), req.body);
  await sendReply(req.params.id, subject, body, { actor: 'recruiter', via: 'ui' });
  res.json({ sent: true });
});

// Mock time-slot picker (instead of Calendly): next 5 weekdays at 10:00 and 15:00.
const slots = (from = new Date()) => {
  const out: string[] = [];
  for (let d = 1; out.length < 10; d++) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + d);
    if (day.getDay() % 6 === 0) continue;
    for (const h of [10, 15]) out.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).toISOString());
  }
  return out;
};

export const getBooking = ah(async (req, res) => {
  const c = await Candidate.findById(req.params.id).lean();
  if (!c) throw new HttpError(404, 'Link not valid');
  const job = await Job.findById(c.jobId).lean();
  res.json({ name: c.name.split(' ')[0], jobTitle: job?.title, meetingAt: c.meetingAt, slots: slots() });
});

export const book = ah(async (req, res) => {
  const { slot } = validate(z.object({ slot: z.string().datetime() }), req.body);
  const c = await Candidate.findById(req.params.id);
  if (!c) throw new HttpError(404, 'Link not valid');
  if (!slots().includes(slot)) throw new HttpError(400, 'Slot not available');
  if (['replied', 'interested', 'not_interested'].includes(c.status)) await changeStatus(String(c._id), 'meeting_booked', { actor: 'system', via: 'ui', note: 'Booked via link' });
  else if (c.status !== 'meeting_booked') throw new HttpError(409, 'Booking is not open for this candidate');
  await Candidate.updateOne({ _id: c._id }, { meetingAt: new Date(slot) });
  await logActivity({ jobId: c.jobId, candidateId: c._id, candidateName: c.name, type: 'meeting', actor: 'system', via: 'ui', note: `Meeting at ${slot}` });
  res.json({ meetingAt: slot });
});
