import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, Field, Textarea } from '../../../components/ui';
import { CandidateTable } from '../../../components/candidates/CandidateTable';
import { CardShell, type CardProps } from './CardShell';

export function SourcingConfirmCard(props: CardProps) {
  const d = props.message.card!.data;
  const [queries, setQueries] = useState<string>(((d.queries as string[] | undefined) ?? []).join('\n'));
  const [useWeb, setUseWeb] = useState<boolean>(d.useWeb ?? true);
  const list = () => queries.split('\n').map((q) => q.trim()).filter(Boolean);
  if (props.message.card!.status !== 'pending')
    return (
      <CardShell {...props} eyebrow="Sourcing" title={`${(d.queries ?? []).length} search queries`}>
        <ul className="flex flex-col gap-1">{(d.queries ?? []).map((q: string) => <li key={q} className="font-mono text-xs text-muted-foreground">{q}</li>)}</ul>
      </CardShell>
    );
  return (
    <CardShell {...props} eyebrow="Start sourcing?" title="Search LinkedIn profiles, dedupe and score" confirmLabel="Start sourcing" getEdits={() => ({ queries: list(), useWeb })}>
      <p className="text-muted-foreground">I'll run each Google search below, merge the results, remove duplicates and score everyone 0–100 against the job.</p>
      <Field label="Search queries · one per line"><Textarea className="font-mono text-xs" rows={Math.max(3, list().length + 1)} value={queries} onChange={(e) => setQueries(e.target.value)} /></Field>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={useWeb} onChange={(e) => setUseWeb(e.target.checked)} /> Search the web
      </label>
    </CardShell>
  );
}

export const ScoringConfirmCard = (props: CardProps) => (
  <CardShell {...props} eyebrow="Score candidates?" title="Score every unscored candidate" confirmLabel="Score now" />
);

export function SourcingProgressCard(props: CardProps) {
  const d = props.message.card!.data;
  const total = d.toScore || d.added || 0;
  const pct = total ? Math.round(((d.scored ?? 0) / total) * 100) : d.done ? 100 : 0;
  const state = d.error ? 'Failed' : d.done ? 'Done' : 'Running';
  return (
    <CardShell {...props} eyebrow={`Sourcing · ${state}`} title={`Found ${d.found ?? 0} · added ${d.added ?? 0} · scored ${d.scored ?? 0}${total ? ` of ${total}` : ''}`}>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-width duration-200 ${d.error ? 'bg-destructive' : d.done ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
      </div>
      {(d.notes as string[] | undefined)?.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
      {d.error && <p className="text-xs text-destructive">{d.error}</p>}
    </CardShell>
  );
}

export const CandidateTableCard = (props: CardProps) => {
  const jobId = props.message.card!.data.jobId;
  return (
    <CardShell {...props} eyebrow="Review" title="Candidates, best match first">
      <CandidateTable jobId={jobId} compact />
      <Link className="flex items-center gap-1.5 self-start font-medium text-primary hover:underline" to={`/jobs/${jobId}`}>Open job page <ArrowIcon /></Link>
    </CardShell>
  );
};
