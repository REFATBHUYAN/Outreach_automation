import { useState } from 'react';
import { Badge, Button, DataTable, LinkIcon, type Column, type Tone } from '../ui';
import { StatusBadge } from './StatusBadge';
import { CsvUpload } from './CsvUpload';
import { api } from '../../lib/api';
import { forJob, useApi } from '../../lib/useApi';
import type { Candidate, Status } from '../../lib/types';

const SCORE_TONE: Record<string, string> = {
  success: 'bg-success/15 text-success', warning: 'bg-warning/15 text-warning', neutral: 'bg-muted text-muted-foreground',
} satisfies Partial<Record<Tone, string>>;
const scoreTone = (s?: number) => (s == null ? 'neutral' : s >= 80 ? 'success' : s >= 60 ? 'warning' : 'neutral');

const Score = ({ score }: { score?: number }) => (
  <span className={`inline-flex h-7 w-10 items-center justify-center rounded-md font-mono text-xs font-bold ${SCORE_TONE[scoreTone(score)]}`}>{score ?? '—'}</span>
);

/** Review table: score, profile details, the AI's reason, accept/reject. */
export function CandidateTable({ jobId, onSelect, selectedId }: { jobId: string; onSelect?: (c: Candidate) => void; selectedId?: string; compact?: boolean }) {
  const { data = [], reload } = useApi<Candidate[]>(`/jobs/${jobId}/candidates`, forJob(jobId));
  const [error, setError] = useState<string>();
  const decide = (c: Candidate, status: Status) =>
    api(`/candidates/${c._id}/status`, { method: 'PATCH', json: { status } }).then(reload, (e: Error) => setError(e.message));

  const columns: Column<Candidate>[] = [
    { header: 'Score', cell: (c) => <Score score={c.score} /> },
    {
      header: 'Candidate',
      cell: (c) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">{c.name}</span>
          {c.headline && <span className="text-xs">{c.headline}</span>}
          {(c.company || c.location || c.education) && (
            <span className="text-xs text-muted-foreground">{[c.company, c.location, c.education].filter(Boolean).join(' · ')}</span>
          )}
          {c.profileUrl && (
            <a href={c.profileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 self-start font-mono text-2xs text-primary hover:underline">
              {c.profileUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')} <LinkIcon />
            </a>
          )}
          {c.email && <span className="font-mono text-2xs text-muted-foreground">{c.email}</span>}
          {!!c.skills?.length && <span className="flex flex-wrap gap-1 pt-0.5">{c.skills.slice(0, 6).map((s) => <Badge key={s}>{s}</Badge>)}</span>}
          <p className="max-w-prose pt-1 text-xs">{c.reason ?? <span className="text-muted-foreground">Scoring…</span>}</p>
        </div>
      ),
    },
    { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    {
      header: '',
      className: 'text-right',
      cell: (c) => (
        <div className="flex justify-end gap-1.5">
          {c.allowedNext.includes('accepted') && <Button size="sm" onClick={() => decide(c, 'accepted')}>Accept</Button>}
          {c.status === 'sourced' && <Button size="sm" variant="outline" onClick={() => decide(c, 'rejected')}>Reject</Button>}
          {onSelect && <Button size="sm" variant={selectedId === c._id ? 'secondary' : 'ghost'} onClick={() => onSelect(c)}>Details</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{data.length} candidates · {data.filter((c) => c.status === 'accepted').length} accepted</span>
        <CsvUpload jobId={jobId} />
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      <DataTable columns={columns} rows={data} rowKey={(c) => c._id} selectedKey={selectedId} empty="No candidates yet — start sourcing or upload a CSV" />
    </div>
  );
}
