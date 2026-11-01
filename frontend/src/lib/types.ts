export type Status =
  | 'sourced' | 'accepted' | 'rejected' | 'contacted' | 'replied' | 'interested' | 'not_interested'
  | 'meeting_booked' | 'interviewed' | 'shortlisted' | 'hired' | 'unsubscribed';

export const FUNNEL: Status[] = ['sourced', 'accepted', 'contacted', 'replied', 'interested', 'meeting_booked', 'interviewed', 'shortlisted', 'hired'];

export interface Card { type: string; status: 'pending' | 'confirmed' | 'cancelled' | 'info'; data: Record<string, any> } // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Message { _id: string; role: 'user' | 'assistant'; text: string; card?: Card; jobId?: string; archived?: boolean; createdAt: string }

export interface Stats {
  total: number; funnel: Record<Status, number>; contacted: number; replied: number; interested: number;
  meetings: number; hires: number; replyRate: number; interestedRate: number;
}
export interface Job {
  _id: string; title: string; description?: string; mustHave: string[]; niceToHave: string[];
  seniority?: string; location?: string; salary?: string; remotePolicy?: string; autoReply: boolean; searchQueries?: string[];
  usage?: { inputTokens: number; outputTokens: number; costUsd: number }; stats: Stats; createdAt: string;
}
export interface ThreadItem { direction: 'in' | 'out'; subject?: string; body: string; at: string }
export interface Candidate {
  _id: string; jobId: string; name: string; email?: string; profileUrl?: string; headline?: string; location?: string;
  company?: string; education?: string; summary?: string; skills?: string[]; query?: string;
  source: 'web' | 'csv'; score?: number; reason?: string; status: Status; allowedNext: Status[];
  replyClass?: string; flagged?: boolean; pendingReply?: { subject: string; body: string } | null; meetingAt?: string; thread: ThreadItem[];
}
export interface Draft { candidateId: string; name: string; email: string; step: number; subject: string; body: string }
export interface Campaign { _id: string; jobId: string; status: 'draft' | 'active' | 'paused' | 'cancelled'; steps: { day: number }[]; drafts: Draft[]; dailyLimit?: number; createdAt: string }
export interface Activity { _id: string; type: string; candidateName?: string; from?: string; to?: string; actor?: string; via?: string; note?: string; createdAt: string }

export type AppEvent =
  | { type: 'message'; message: Message }
  | { type: 'candidate'; jobId: string; candidateId: string }
  | { type: 'campaign'; jobId: string; campaignId: string }
  | { type: 'job'; jobId: string } // created or updated
  | { type: 'chat_cleared' };
