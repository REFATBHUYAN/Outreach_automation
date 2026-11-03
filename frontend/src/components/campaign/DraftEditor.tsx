import { Field, Input, Textarea } from '../ui';
import type { Draft } from '../../lib/types';

/** Every personalised email of a campaign, editable until it is approved. */
export function DraftEditor({ drafts, steps, onChange, editable }: { drafts: Draft[]; steps: { day: number }[]; onChange: (d: Draft[]) => void; editable: boolean }) {
  const edit = (i: number, k: 'subject' | 'body', v: string) => onChange(drafts.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  return (
    <div className="flex max-h-dialog flex-col gap-4 overflow-y-auto">
      {drafts.map((d, i) => (
        <div key={`${d.candidateId}-${d.step}`} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
          <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{d.name}</span> · <span className="font-mono">{d.email}</span> · step {d.step + 1} (day {steps[d.step]?.day})</p>
          <Field label="Subject"><Input value={d.subject} onChange={(e) => edit(i, 'subject', e.target.value)} disabled={!editable} /></Field>
          <Field label="Body"><Textarea rows={6} value={d.body} onChange={(e) => edit(i, 'body', e.target.value)} disabled={!editable} /></Field>
        </div>
      ))}
    </div>
  );
}
