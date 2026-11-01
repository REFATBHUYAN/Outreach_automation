import { STATUSES, type Status } from './pipeline';

export interface StatInput { status: Status; reached?: Partial<Record<Status, Date | string>> }

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

/** Funnel and rates for one job. `reached` records every status a candidate has ever entered. */
export function computeStats(cs: StatInput[]) {
  const funnel = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
  cs.forEach((c) => funnel[c.status]++);
  const ever = (s: Status) => cs.filter((c) => c.reached?.[s]).length;
  const contacted = ever('contacted');
  const replied = ever('replied');
  const interested = cs.filter((c) => c.reached?.interested || c.reached?.meeting_booked).length;
  return {
    total: cs.length, funnel, contacted, replied, interested,
    meetings: ever('meeting_booked'), hires: funnel.hired,
    replyRate: pct(replied, contacted), interestedRate: pct(interested, contacted),
  };
}
export type JobStats = ReturnType<typeof computeStats>;
