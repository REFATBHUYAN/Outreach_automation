import { useState } from 'react';
import { Badge, Field, Input, Textarea } from '../../../components/ui';
import { label } from '../../../lib/format';
import { CardShell, type CardProps } from './CardShell';

export function ReplyDraftCard(props: CardProps) {
  const d = props.message.card!.data;
  const [subject, setSubject] = useState<string>(d.subject);
  const [body, setBody] = useState<string>(d.body);
  const editable = props.message.card!.status === 'pending';
  return (
    <CardShell {...props} eyebrow="Candidate reply" title={d.name} confirmLabel="Send reply" getEdits={() => ({ subject, body })}>
      <div className="flex items-center gap-2">
        <Badge tone="info">{label(d.category)}</Badge>
        {d.flagged && <Badge tone="warning">possible prompt injection</Badge>}
      </div>
      <blockquote className="whitespace-pre-wrap border-l-2 border-border pl-3 text-muted-foreground">{d.inbound}</blockquote>
      <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!editable} /></Field>
      <Field label="Draft reply"><Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} disabled={!editable} /></Field>
    </CardShell>
  );
}
