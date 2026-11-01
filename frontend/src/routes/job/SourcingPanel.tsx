import { useEffect, useState } from 'react';
import { Button, Card, Eyebrow, Input, PlusIcon, SearchIcon, SectionTitle, SparkIcon, XIcon } from '../../components/ui';
import { post } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { useEvents } from '../../lib/events';
import type { Job, Message } from '../../lib/types';

/** Find candidates: AI-written Google queries (editable) → search all → dedupe → score, with live progress. */
export function SourcingPanel({ job, unscored }: { job: Job; unscored: number }) {
  const [queries, setQueries] = useState<string[]>(job.searchQueries ?? []);
  const [busy, setBusy] = useState<'queries' | 'search'>();
  const [error, setError] = useState<string>();
  const { data: progress, setData: setProgress } = useApi<Message | null>(`/jobs/${job._id}/sourcing`, () => false);
  useEffect(() => {
    setQueries(job.searchQueries ?? []);
  }, [job.searchQueries]);
  useLiveProgress(job._id, setProgress);

  const run = <T,>(kind: 'queries' | 'search', p: Promise<T>, then: (v: T) => void) => {
    setBusy(kind);
    setError(undefined);
    p.then(then, (e: Error) => setError(e.message)).finally(() => setBusy(undefined));
  };
  const generate = () => run('queries', post<{ queries: string[] }>(`/jobs/${job._id}/queries`), (r) => setQueries(r.queries));
  const search = () => run('search', post<Message>(`/jobs/${job._id}/source`, { queries: queries.filter((q) => q.trim()) }), setProgress);
  const score = () => run('search', post<Message>(`/jobs/${job._id}/score`), setProgress);
  const d = progress?.card?.data;
  const running = d && !d.done;

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="grid grid-content-action items-start gap-4">
        <div className="flex flex-col gap-1">
          <SectionTitle>Find candidates</SectionTitle>
          <p className="text-muted-foreground">The AI writes Google searches for public LinkedIn profiles. Edit them, then search — results are merged, deduplicated and scored.</p>
        </div>
        <Button variant="outline" onClick={generate} disabled={!!busy}><SparkIcon /> {busy === 'queries' ? 'Writing…' : queries.length ? 'Rewrite queries' : 'Write queries with AI'}</Button>
      </div>

      {queries.length > 0 && (
        <div className="flex flex-col gap-2">
          <Eyebrow>Search queries</Eyebrow>
          {queries.map((q, i) => (
            <div key={i} className="grid grid-content-action items-center gap-2">
              <Input className="font-mono text-xs" value={q} aria-label={`Query ${i + 1}`} onChange={(e) => setQueries(queries.map((x, j) => (j === i ? e.target.value : x)))} />
              <Button size="icon" variant="ghost" aria-label={`Remove query ${i + 1}`} onClick={() => setQueries(queries.filter((_, j) => j !== i))}><XIcon /></Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onClick={() => setQueries([...queries, 'site:linkedin.com/in '])} disabled={queries.length >= 8}><PlusIcon /> Add query</Button>
            <Button onClick={search} disabled={!!busy || !!running || !queries.some((q) => q.trim())}><SearchIcon /> {running ? 'Searching…' : `Search ${queries.length} ${queries.length === 1 ? 'query' : 'queries'}`}</Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}

      {d && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{d.error ? 'Stopped' : d.done ? (d.found ? 'Search complete' : 'Scoring complete') : d.found ? 'Searching…' : 'Scoring…'}</span>
            <span className="font-mono text-xs">{d.found ? `found ${d.found} · new ${d.added ?? 0} · ` : ''}scored {d.scored ?? 0}{d.toScore ? `/${d.toScore}` : ''}</span>
          </div>
          {(d.notes as string[] | undefined)?.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
          {d.error && <p className="text-xs text-destructive">{d.error}</p>}
        </div>
      )}
      {unscored > 0 && !running && (
        <div className="grid grid-content-action items-center gap-2 rounded-lg border border-border p-4">
          <p className="text-xs">{unscored} candidates are not scored yet.</p>
          <Button size="sm" variant="outline" onClick={score} disabled={!!busy}><SparkIcon /> Score {unscored} unscored</Button>
        </div>
      )}
    </Card>
  );
}

// Live updates for this job's latest sourcing run.
function useLiveProgress(jobId: string, set: (m: Message) => void) {
  useEvents((e) => {
    if (e.type === 'message' && e.message.card?.type === 'sourcing_progress' && e.message.card.data.jobId === jobId) set(e.message);
  });
}
