import { describe, it, expect } from 'vitest';
import { canTransition, STATUSES, allowedNext } from '../src/services/pipeline';

describe('pipeline', () => {
  it('follows the happy path from sourced to hired', () => {
    const path = ['sourced', 'accepted', 'contacted', 'replied', 'interested', 'meeting_booked', 'interviewed', 'shortlisted', 'hired'] as const;
    for (let i = 1; i < path.length; i++) expect(canTransition(path[i - 1], path[i])).toBe(true);
  });
  it('blocks skipping ahead and leaving terminal states', () => {
    expect(canTransition('sourced', 'hired')).toBe(false);
    expect(canTransition('sourced', 'contacted')).toBe(false);
    expect(allowedNext('hired')).toEqual([]);
    expect(allowedNext('unsubscribed')).toEqual([]);
  });
  it('allows unsubscribe only after contact', () => {
    expect(canTransition('accepted', 'unsubscribed')).toBe(false);
    for (const s of ['contacted', 'replied', 'interested', 'meeting_booked', 'interviewed', 'shortlisted'] as const)
      expect(canTransition(s, 'unsubscribed')).toBe(true);
  });
  it('defines transitions for every status', () => STATUSES.forEach((s) => expect(Array.isArray(allowedNext(s))).toBe(true)));
});
