import { useEffect, useState } from 'react';
import { Badge } from '../../../components/ui';
import { DraftEditor } from '../../../components/campaign/DraftEditor';
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

  if (!campaign) return null;
  const recipients = new Set(drafts.map((d) => d.candidateId)).size;
  return (
    <CardShell {...props} eyebrow="Outreach campaign" title={`${recipients} recipients · day ${campaign.steps.map((s) => s.day).join(' / ')}`} confirmLabel={`Approve & send to ${recipients}`} getEdits={() => ({ drafts })}>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status}</Badge>
        Daily limit {campaign.dailyLimit} · nothing is sent until you approve
      </p>
      {!editable && <button className="self-start text-xs font-medium text-primary hover:underline" onClick={() => setOpen(!open)}>{open ? 'Hide emails' : `Show ${drafts.length} emails`}</button>}
      {(editable || open) && <DraftEditor drafts={drafts} steps={campaign.steps} onChange={setDrafts} editable={editable} />}
    </CardShell>
  );
}
