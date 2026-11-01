import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowIcon, Badge, Field, Input, Textarea, eyebrowClass } from '../../../components/ui';
import { CardShell, type CardProps } from './CardShell';

const TEXT = ['title', 'seniority', 'location', 'salary', 'remotePolicy'] as const;
const LISTS = ['mustHave', 'niceToHave'] as const;
const LABELS: Record<string, string> = { title: 'Title', seniority: 'Seniority', location: 'Location', salary: 'Salary', remotePolicy: 'Remote policy', mustHave: 'Must have', niceToHave: 'Nice to have' };

export function JobConfirmCard(props: CardProps) {
  const d = props.message.card!.data;
  const [form, setForm] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(TEXT.map((k) => [k, d[k] ?? ''])),
    ...Object.fromEntries(LISTS.map((k) => [k, (d[k] ?? []).join(', ')])),
    description: d.description ?? '',
  }));
  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const getEdits = () => ({ ...form, ...Object.fromEntries(LISTS.map((k) => [k, form[k].split(',').map((s) => s.trim()).filter(Boolean)])) });

  if (props.message.card!.status !== 'pending')
    return (
      <CardShell {...props} eyebrow="Job" title={d.title}>
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {(['seniority', 'location', 'remotePolicy', 'salary'] as const).filter((k) => d[k]).map((k) => (
            <div key={k} className="flex flex-col"><dt className={eyebrowClass}>{LABELS[k]}</dt><dd>{d[k]}</dd></div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-1.5">{(d.mustHave ?? []).map((s: string) => <Badge key={s} tone="info">{s}</Badge>)}{(d.niceToHave ?? []).map((s: string) => <Badge key={s}>{s}</Badge>)}</div>
        {d.jobId && <Link className="flex items-center gap-1.5 self-start font-medium text-primary hover:underline" to={`/jobs/${d.jobId}`}>Open job <ArrowIcon /></Link>}
      </CardShell>
    );

  return (
    <CardShell {...props} eyebrow="Confirm job" title="Check the details I extracted" confirmLabel="Create job" getEdits={getEdits}>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT.map((k) => <Field key={k} label={LABELS[k]}><Input value={form[k]} onChange={set(k)} placeholder="Not stated in the JD" /></Field>)}
      </div>
      {LISTS.map((k) => <Field key={k} label={`${LABELS[k]} · comma separated`}><Input value={form[k]} onChange={set(k)} /></Field>)}
      <Field label="Summary"><Textarea rows={3} value={form.description} onChange={set('description')} /></Field>
    </CardShell>
  );
}
