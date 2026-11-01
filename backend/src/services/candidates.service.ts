import { Candidate } from '../models/Candidate';
import { Activity } from '../models/Activity';
import { allowedNext, canTransition, type Status } from './pipeline';
import { publish } from './events';
import { HttpError } from '../middleware/errors';

export interface Actor { actor: 'recruiter' | 'ai' | 'system'; via: 'ui' | 'chat' | 'worker'; note?: string }

/** The single way a candidate's status changes: validates the transition and writes the activity log. */
export async function changeStatus(candidateId: string, to: Status, by: Actor) {
  const c = await Candidate.findById(candidateId);
  if (!c) throw new HttpError(404, 'Candidate not found');
  const from = c.status as Status;
  if (from === to) return c;
  if (!canTransition(from, to))
    throw new HttpError(409, `Cannot move ${c.name} from ${from} to ${to}. Allowed: ${allowedNext(from).join(', ') || 'none'}`);
  c.status = to;
  c.reached = { ...c.reached, [to]: c.reached?.[to] ?? new Date() };
  await c.save();
  await Activity.create({ jobId: c.jobId, candidateId: c._id, candidateName: c.name, type: 'status_change', from, to, ...by });
  publish({ type: 'candidate', jobId: String(c.jobId), candidateId: String(c._id) });
  return c;
}

export const logActivity = (a: Record<string, unknown>) => Activity.create(a);
