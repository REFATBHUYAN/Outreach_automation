import { useEffect, useState } from 'react';
import { Badge, Field, Input, Textarea } from '../../../components/ui';
import { useApi } from '../../../lib/useApi';
import type { Campaign, Draft } from '../../../lib/types';
import { CardShell, type CardProps } from './CardShell';

/** Preview and edit every personalised email before approving the campaign. */
export function CampaignPreviewCard(props: CardProps) {
  const { campaignId } = props.message.card!.data;
  const { data: campaign } = useApi<Campaign>(`/campaigns/${campaignId}`, (e) => e.type === 'campaign' && e.campaignId === campaignId);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (campaign) setDrafts(campaign.drafts);
  }, [campaign]);
  const editable = props.message.card!.status === 'pending';
  const edit = (i: number, k: 'subject' | 'body', v: string) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, [k]: v } : d)));

  if (!campaign) return null;
  const recipients = new Set(drafts.map((d) => d.candidateId)).size;
  return (
    <CardShell {...props} eyebrow="Outreach campaign" title={`${recipients} recipients · day ${campaign.steps.map((s) => s.day).join(' / ')}`} confirmLabel={`Approve & send to ${recipients}`} getEdits={() => ({ drafts })}>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status}</Badge>
        Daily limit {campaign.dailyLimit} · nothing is sent until you approve
      </p>
      {!editable && <button className="self-start text-xs font-medium text-primary hover:underline" onClick={() => setOpen(!open)}>{open ? 'Hide emails' : `Show ${drafts.length} emails`}</button>}
      {(editable || open) && <div className="flex max-h-dialog flex-col gap-4 overflow-y-auto">
        {drafts.map((d, i) => (
          <div key={`${d.candidateId}-${d.step}`} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{d.name}</span> · <span className="font-mono">{d.email}</span> · step {d.step} (day {campaign.steps[d.step]?.day})</p>
            <Field label="Subject"><Input value={d.subject} onChange={(e) => edit(i, 'subject', e.target.value)} disabled={!editable} /></Field>
            <Field label="Body"><Textarea rows={6} value={d.body} onChange={(e) => edit(i, 'body', e.target.value)} disabled={!editable} /></Field>
          </div>
        ))}
      </div>}
    </CardShell>
  );
}
