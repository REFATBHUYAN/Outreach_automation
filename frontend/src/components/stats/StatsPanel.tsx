import { eyebrowClass } from '../ui';
import { label } from '../../lib/format';
import { FUNNEL, type Job } from '../../lib/types';

/** KPIs (hairline grid, no nested boxes) and the pipeline: candidates per status. */
export function StatsPanel({ job }: { job: Pick<Job, 'stats' | 'usage'> }) {
  const s = job.stats;
  const max = Math.max(1, ...FUNNEL.map((k) => s.funnel[k] ?? 0));
  const kpis: [string, string | number][] = [
    ['Candidates', s.total], ['Reply rate', `${s.replyRate}%`], ['Interested', `${s.interestedRate}%`],
    ['Meetings', s.meetings], ['Hires', s.hires], ['AI cost', `$${(job.usage?.costUsd ?? 0).toFixed(2)}`],
  ];
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3 xl:grid-cols-6">
        {kpis.map(([name, value]) => (
          <div key={name} className="flex flex-col gap-1 bg-card px-4 py-3">
            <dt className={eyebrowClass}>{name}</dt>
            <dd className="font-mono text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <p className={eyebrowClass}>Pipeline · candidates per status</p>
        <dl className="flex flex-col gap-1.5">
          {FUNNEL.map((k) => (
            <div key={k} className="grid grid-funnel items-center gap-3">
              <dt className="text-xs capitalize text-muted-foreground">{label(k)}</dt>
              <dd className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-chart-1" style={{ width: `${((s.funnel[k] ?? 0) / max) * 100}%` }} />
              </dd>
              <dd className="text-right font-mono text-xs font-medium">{s.funnel[k] ?? 0}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">Also {s.funnel.rejected ?? 0} rejected · {s.funnel.not_interested ?? 0} not interested · {s.funnel.unsubscribed ?? 0} unsubscribed</p>
      </div>
    </div>
  );
}
