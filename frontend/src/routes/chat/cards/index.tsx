import type { ComponentType } from 'react';
import type { CardProps } from './CardShell';
import { JobConfirmCard } from './JobConfirmCard';
import { CandidateTableCard, ScoringConfirmCard, SourcingConfirmCard, SourcingProgressCard } from './SourcingCards';
import { DecisionConfirmCard, StatusConfirmCard } from './DecisionCards';
import { CampaignPreviewCard } from './CampaignPreviewCard';
import { ReplyDraftCard } from './ReplyDraftCard';
import { StatsCard } from './StatsCard';

// One component per card type the backend can emit (backend/src/views/cards.ts).
const REGISTRY: Record<string, ComponentType<CardProps>> = {
  job_confirm: JobConfirmCard,
  sourcing_confirm: SourcingConfirmCard,
  scoring_confirm: ScoringConfirmCard,
  sourcing_progress: SourcingProgressCard,
  candidate_table: CandidateTableCard,
  decision_confirm: DecisionConfirmCard,
  status_confirm: StatusConfirmCard,
  campaign_preview: CampaignPreviewCard,
  reply_draft: ReplyDraftCard,
  stats: StatsCard,
};

export function ChatCard(props: CardProps) {
  const C = REGISTRY[props.message.card!.type];
  return C ? <C {...props} /> : null;
}
