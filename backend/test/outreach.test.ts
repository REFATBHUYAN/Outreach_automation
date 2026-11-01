import { describe, it, expect } from 'vitest';
import { stepDelay, shouldSend, nextDayStart } from '../src/services/outreach';

describe('outreach', () => {
  const steps = [{ day: 0 }, { day: 3 }, { day: 7 }];
  it('schedules each step relative to the previous one', () => {
    expect(stepDelay(steps, 0, 1000)).toBe(0);
    expect(stepDelay(steps, 1, 1000)).toBe(3000);
    expect(stepDelay(steps, 2, 1000)).toBe(4000);
  });
  it('sends first step to accepted, follow-ups only to silent contacted candidates with email', () => {
    expect(shouldSend({ status: 'accepted', email: 'a@x.com' }, 0)).toBe(true);
    expect(shouldSend({ status: 'accepted' }, 0)).toBe(false);
    expect(shouldSend({ status: 'contacted', email: 'a@x.com' }, 1)).toBe(true);
    expect(shouldSend({ status: 'replied', email: 'a@x.com' }, 1)).toBe(false);
    expect(shouldSend({ status: 'unsubscribed', email: 'a@x.com' }, 2)).toBe(false);
  });
  it('computes the next day boundary', () => expect(nextDayStart(new Date(2026, 0, 31, 15)).getTime()).toBe(new Date(2026, 1, 1).getTime()));
});
