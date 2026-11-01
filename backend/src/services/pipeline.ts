export const STATUSES = [
  'sourced', 'accepted', 'rejected', 'contacted', 'replied', 'interested', 'not_interested',
  'meeting_booked', 'interviewed', 'shortlisted', 'hired', 'unsubscribed',
] as const;
export type Status = (typeof STATUSES)[number];

// Sourced → Accepted/Rejected → Contacted → Replied → Interested/Not interested → Meeting booked
// → Interviewed → Shortlisted → Hired/Rejected. Unsubscribed is reachable from any point after Contacted.
const TRANSITIONS: Record<Status, Status[]> = {
  sourced: ['accepted', 'rejected'],
  accepted: ['contacted', 'rejected'],
  rejected: ['accepted'],
  contacted: ['replied', 'unsubscribed', 'rejected'],
  replied: ['interested', 'not_interested', 'meeting_booked', 'unsubscribed', 'rejected'],
  interested: ['meeting_booked', 'interviewed', 'unsubscribed', 'rejected'],
  not_interested: ['interested', 'unsubscribed', 'rejected'],
  meeting_booked: ['interviewed', 'unsubscribed', 'rejected'],
  interviewed: ['shortlisted', 'hired', 'unsubscribed', 'rejected'],
  shortlisted: ['hired', 'unsubscribed', 'rejected'],
  hired: [],
  unsubscribed: [],
};

export const allowedNext = (from: Status) => TRANSITIONS[from];
export const canTransition = (from: Status, to: Status) => TRANSITIONS[from].includes(to);
