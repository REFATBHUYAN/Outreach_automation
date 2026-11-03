import { useState } from 'react';
import { Badge, Button, Card, Eyebrow, Field, Input, PlusIcon, SectionTitle, SendIcon, SparkIcon, XIcon } from '../../components/ui';
import { DraftEditor } from '../../components/campaign/DraftEditor';
import { post } from '../../lib/api';
import type { Campaign, Candidate, Draft } from '../../lib/types';
import { CampaignList } from './CampaignList';

interface Step { day: number; instructions: string }
const DEFAULT_STEPS: Step[] = [{ day: 0, instructions: '' }, { day: 3, instructions: 'Short friendly follow-up' }];

/** After review: build a campaign, let the AI draft every email, edit, approve. Nothing is sent before approval. */
export function OutreachPanel({ jobId, candidates }: { jobId: string; candidates: Candidate[] }) {
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [draft, setDraft] = useState<Campaign>();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState<string>();
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});

  const accepted = candidates.filter((c) => c.status === 'accepted');
  const ready = accepted.filter((c) => c.email);
  const missing = accepted.length - ready.length;

  const run = <T,>(kind: string, p: Promise<T>, then: (v: T) => void) => {
    setBusy(kind);
    setMsg({});
    p.then(then, (e: Error) => setMsg({ error: e.message })).finally(() => setBusy(undefined));
  };
  const create = () => run('create', post<Campaign>(`/jobs/${jobId}/campaigns`, { steps: steps.map((s) => ({ day: s.day, instructions: s.instructions || undefined })), dailyLimit }), (c) => { setDraft(c); setDrafts(c.drafts); });
  const approve = () => run('approve', post(`/campaigns/${draft!._id}/approve`, { drafts }), () => { setDraft(undefined); setMsg({ ok: 'Campaign approved — emails are being sent in the background.' }); });
  const discard = () => run('discard', post(`/campaigns/${draft!._id}/cancel`), () => setDraft(undefined));
  const setStep = (i: number, patch: Partial<Step>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <SectionTitle>Outreach</SectionTitle>
        <p className="text-muted-foreground">Email accepted candidates: one message or a sequence with follow-ups. Follow-ups stop as soon as someone replies or unsubscribes.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="info">{accepted.length} accepted</Badge>
        <Badge tone={ready.length ? 'success' : 'neutral'}>{ready.length} with email</Badge>
        {missing > 0 && <span className="text-muted-foreground">Add an email for the other {missing} in their Details panel to include them.</span>}
      </div>

      {!draft ? (
        <>
          <div className="flex flex-col gap-2">
            <Eyebrow>Sequence</Eyebrow>
            {steps.map((s, i) => (
              <div key={i} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-3 sm:col-span-2">
                  <Field label={i === 0 ? 'Day' : `Day · step ${i + 1}`}>
                    <Input type="number" min={i === 0 ? 0 : 1} max={60} value={s.day} disabled={i === 0} onChange={(e) => setStep(i, { day: Number(e.target.value) })} />
                  </Field>
                </div>
                <div className="col-span-8 sm:col-span-9">
                  <Field label="Instructions for the AI (optional)">
                    <Input value={s.instructions} placeholder={i === 0 ? 'e.g. mention the hybrid setup' : 'e.g. brief reminder'} onChange={(e) => setStep(i, { instructions: e.target.value })} />
                  </Field>
                </div>
                <div className="col-span-1">
                  {i > 0 && <Button size="icon" variant="ghost" aria-label={`Remove step ${i + 1}`} onClick={() => setSteps(steps.filter((_, j) => j !== i))}><XIcon /></Button>}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Button size="sm" variant="ghost" disabled={steps.length >= 5} onClick={() => setSteps([...steps, { day: (steps.at(-1)?.day ?? 0) + 4, instructions: '' }])}><PlusIcon /> Add follow-up</Button>
              <div className="flex items-end gap-2">
                <Field label="Daily limit"><Input type="number" min={1} max={500} className="w-24" value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} /></Field>
                <Button onClick={create} disabled={!!busy || !ready.length}><SparkIcon /> {busy === 'create' ? `Writing ${ready.length * steps.length} emails…` : 'Write drafts with AI'}</Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>Review {drafts.length} drafts — edit anything, then approve</Eyebrow>
            <Badge tone="info">Draft · not sent</Badge>
          </div>
          <DraftEditor drafts={drafts} steps={draft.steps} onChange={setDrafts} editable />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={discard} disabled={!!busy}>Discard</Button>
            <Button onClick={approve} disabled={!!busy}><SendIcon /> {busy === 'approve' ? 'Starting…' : `Approve & send to ${new Set(drafts.map((d) => d.candidateId)).size}`}</Button>
          </div>
        </div>
      )}

      {msg.ok && <p className="text-xs text-success">{msg.ok}</p>}
      {msg.error && <p className="text-xs text-destructive" role="alert">{msg.error}</p>}
      <CampaignList jobId={jobId} />
    </Card>
  );
}
