import { describe, it, expect } from 'vitest';
import { computeStats } from '../src/services/stats';

const d = new Date();
describe('computeStats', () => {
  it('computes funnel and rates from reached timestamps', () => {
    const s = computeStats([
      { status: 'sourced' },
      { status: 'rejected' },
      { status: 'contacted', reached: { contacted: d } },
      { status: 'not_interested', reached: { contacted: d, replied: d, not_interested: d } },
      { status: 'meeting_booked', reached: { contacted: d, replied: d, meeting_booked: d } },
      { status: 'hired', reached: { contacted: d, replied: d, interested: d, meeting_booked: d, hired: d } },
    ]);
    expect(s.total).toBe(6);
    expect(s.funnel.hired).toBe(1);
    expect(s.contacted).toBe(4);
    expect(s.replyRate).toBe(75);
    expect(s.interestedRate).toBe(50);
    expect(s.meetings).toBe(2);
    expect(s.hires).toBe(1);
  });
  it('returns zero rates with nobody contacted', () => expect(computeStats([]).replyRate).toBe(0));
});
