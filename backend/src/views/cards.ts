// Views: chat cards are the presentation layer of this API. Each builder returns the persisted
// `card` field of a Message; the frontend renders one component per `type`.
export type CardStatus = 'pending' | 'confirmed' | 'cancelled' | 'info';
export interface Card { type: string; data: Record<string, unknown>; status: CardStatus }

const pending = (type: string, data: Record<string, unknown>): Card => ({ type, data, status: 'pending' });
const info = (type: string, data: Record<string, unknown>): Card => ({ type, data, status: 'info' });

export const cards = {
  jobConfirm: (job: Record<string, unknown>) => pending('job_confirm', job),
  sourcingConfirm: (jobId: string, queries: string[]) => pending('sourcing_confirm', { jobId, queries, useWeb: true }),
  scoringConfirm: (jobId: string) => pending('scoring_confirm', { jobId }),
  sourcingProgress: (jobId: string) => info('sourcing_progress', { jobId, found: 0, added: 0, scored: 0, done: false, notes: [] }),
  candidateTable: (jobId: string) => info('candidate_table', { jobId }),
  decisionConfirm: (jobId: string, decisions: { candidateId: string; name: string; decision: 'accepted' | 'rejected' }[]) =>
    pending('decision_confirm', { jobId, decisions }),
  statusConfirm: (d: { candidateId: string; name: string; from: string; to: string; note?: string }) => pending('status_confirm', d),
  campaignPreview: (campaignId: string, jobId: string) => pending('campaign_preview', { campaignId, jobId }),
  replyDraft: (d: { candidateId: string; name: string; inbound: string; category: string; flagged: boolean; subject: string; body: string }) =>
    pending('reply_draft', d),
  stats: (jobId: string) => info('stats', { jobId }),
};
