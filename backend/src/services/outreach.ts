export interface Step { day: number }

/** Delay before sending step `i`, relative to when step i-1 was sent (step 0 goes immediately). */
export const stepDelay = (steps: Step[], i: number, dayMs: number) =>
  i === 0 ? 0 : Math.max(0, steps[i].day - steps[i - 1].day) * dayMs;

export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const nextDayStart = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

/** First step goes to accepted candidates; follow-ups only to those still silently `contacted`. */
export const shouldSend = (c: { status: string; email?: string | null }, step: number) =>
  !!c.email && c.status === (step === 0 ? 'accepted' : 'contacted');
