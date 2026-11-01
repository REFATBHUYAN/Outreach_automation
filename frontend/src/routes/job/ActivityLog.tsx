import { EmptyState } from '../../components/ui';
import { formatDate, label } from '../../lib/format';
import { forJob, useApi } from '../../lib/useApi';
import type { Activity } from '../../lib/types';

export function ActivityLog({ jobId }: { jobId: string }) {
  const { data = [] } = useApi<Activity[]>(`/jobs/${jobId}/activity`, forJob(jobId));
  if (!data.length) return <EmptyState title="No activity yet" />;
  return (
    <ol className="flex flex-col gap-2">
      {data.map((a) => (
        <li key={a._id} className="flex flex-col border-l border-border pl-2.5 text-xs">
          <span className="font-mono text-2xs text-muted-foreground">{formatDate(a.createdAt)} · {a.actor}{a.via && ` via ${a.via}`}</span>
          <span>
            {a.candidateName && <span className="font-medium">{a.candidateName}: </span>}
            {a.type === 'status_change' ? `${label(a.from ?? '')} → ${label(a.to ?? '')}` : label(a.type)}
            {a.note && <span className="text-muted-foreground"> — {a.note.replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, (iso) => formatDate(iso))}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
