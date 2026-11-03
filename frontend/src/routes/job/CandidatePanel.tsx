import { useEffect, useState } from 'react';
import { Button, Card, Eyebrow, Field, Input, SectionTitle, Textarea } from '../../components/ui';
import { StatusBadge } from '../../components/candidates/StatusBadge';
import { api, post } from '../../lib/api';
import { formatDate, label } from '../../lib/format';
import type { Candidate, Status } from '../../lib/types';

const CAN_REPLY: Status[] = ['contacted', 'replied', 'interested', 'not_interested', 'meeting_booked'];

/** One candidate: status changes, email thread, simulated replies and reply approval. */
export function CandidatePanel({ candidate: c, onChange }: { candidate: Candidate; onChange: () => void }) {
  const [next, setNext] = useState<Status | ''>('');
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [email, setEmail] = useState(c.email ?? '');
  useEffect(() => {
    setEmail(c.email ?? '');
  }, [c.email]);
  const [draft, setDraft] = useState(c.pendingReply);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  useEffect(() => {
    setDraft(c.pendingReply);
  }, [c.pendingReply]);

  const run = (p: Promise<unknown>, ok: string, after?: () => void) =>
    p.then(() => { setMsg({ ok }); after?.(); onChange(); }, (e: Error) => setMsg({ error: e.message }));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <SectionTitle>{c.name}</SectionTitle>
        <div className="flex items-center gap-2"><StatusBadge status={c.status} />{c.score != null && <span className="font-mono text-xs">score {c.score}</span>}</div>
        {c.meetingAt && <p className="text-xs">Meeting: {formatDate(c.meetingAt)}</p>}
      </div>

      {(c.summary || c.query) && (
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Found via search</Eyebrow>
          {c.summary && <p className="text-xs text-muted-foreground">{c.summary}</p>}
          {c.query && <p className="font-mono text-2xs text-muted-foreground">{c.query}</p>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Field label="Email">
          <div className="grid grid-content-action gap-2">
            <Input type="email" placeholder="Needed for outreach" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button size="sm" variant="outline" className="h-auto" disabled={!email.trim() || email === c.email}
              onClick={() => run(api(`/candidates/${c._id}`, { method: 'PATCH', json: { email } }), 'Email saved')}>Save</Button>
          </div>
        </Field>
      </div>

      {c.allowedNext.length > 0 && (
        <div className="flex flex-col gap-2">
          <Field label="Change status">
            <select className="rounded-md border border-input bg-background px-2.5 py-1.5" value={next} onChange={(e) => setNext(e.target.value as Status)}>
              <option value="">Select…</option>
              {c.allowedNext.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
          </Field>
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" disabled={!next} onClick={() => run(api(`/candidates/${c._id}/status`, { method: 'PATCH', json: { status: next, note } }), 'Status updated', () => { setNext(''); setNote(''); })}>Update status</Button>
        </div>
      )}

      {draft && (
        <div className="flex flex-col gap-2">
          <Eyebrow>Pending reply ({label(c.replyClass ?? '')})</Eyebrow>
          <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
          <Textarea rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <Button size="sm" onClick={() => run(post(`/candidates/${c._id}/reply`, draft), 'Reply sent')}>Approve & send</Button>
        </div>
      )}

      {CAN_REPLY.includes(c.status) && (
        <div className="flex flex-col gap-2">
          <Eyebrow>Simulate candidate reply</Eyebrow>
          <Textarea rows={3} placeholder="e.g. Sounds interesting — can we talk on Thursday?" value={reply} onChange={(e) => setReply(e.target.value)} />
          <Button size="sm" variant="secondary" disabled={!reply.trim()} onClick={() => run(post('/simulate-reply', { candidateId: c._id, body: reply }), 'Reply received — the AI is classifying it', () => setReply(''))}>Simulate reply</Button>
        </div>
      )}

      {msg.ok && <p className="text-xs text-success">{msg.ok}</p>}
      {msg.error && <p className="text-xs text-destructive" role="alert">{msg.error}</p>}

      <div className="flex flex-col gap-2">
        <Eyebrow>Thread</Eyebrow>
        {c.thread.length === 0 && <p className="text-xs text-muted-foreground">No emails yet.</p>}
        {c.thread.map((t, i) => (
          <div key={i} className={`rounded-lg p-4 text-xs ${t.direction === 'in' ? 'bg-muted' : 'border border-border'}`}>
            <p className="font-mono text-2xs text-muted-foreground">{t.direction === 'in' ? 'Candidate' : 'Us'} · {formatDate(t.at)}</p>
            {t.subject && <p className="font-medium">{t.subject}</p>}
            <p className="whitespace-pre-wrap">{t.body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
