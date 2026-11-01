import { Campaign } from '../models/Campaign';
import { Candidate } from '../models/Candidate';
import { Job } from '../models/Job';
import { env } from '../config/env';
import { draftOutreach } from './ai.service';
import { enqueueStep } from '../queues/queues';
import { logActivity } from './candidates.service';
import { publish } from './events';
import { HttpError } from '../middleware/errors';

export interface StepInput { day: number; instructions?: string }

/** Creates a draft campaign with AI-personalised emails. Nothing is sent until approveCampaign. */
export async function createDraftCampaign(jobId: string, steps: StepInput[], dailyLimit = env.DAILY_SEND_LIMIT, candidateIds?: string[]) {
  const job = await Job.findById(jobId);
  if (!job) throw new HttpError(404, 'Job not found');
  const sorted = [...steps].sort((a, b) => a.day - b.day);
  if (!sorted.length || sorted[0].day !== 0) throw new HttpError(400, 'The first step must be on day 0');
  // Only accepted candidates with an email address can be added.
  const filter: Record<string, unknown> = { jobId, status: 'accepted', email: { $type: 'string' } };
  if (candidateIds?.length) filter._id = { $in: candidateIds };
  const candidates = await Candidate.find(filter);
  if (!candidates.length) throw new HttpError(400, 'No accepted candidates with an email address to contact');
  const drafts = (
    await Promise.all(candidates.map(async (c) => {
      const emails = await draftOutreach(job, { id: String(c._id), name: c.name, headline: c.headline }, sorted, jobId);
      return sorted.map((_, step) => {
        const e = emails.find((x) => x.step === step) ?? emails[step];
        return { candidateId: c._id, name: c.name, email: c.email, step, subject: e?.subject ?? '', body: e?.body ?? '' };
      });
    }))
  ).flat();
  return Campaign.create({ jobId, steps: sorted, drafts, dailyLimit });
}

export async function updateDrafts(campaignId: string, drafts: { candidateId: string; step: number; subject: string; body: string }[]) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status !== 'draft') throw new HttpError(409, 'Only draft campaigns can be edited');
  for (const d of drafts) {
    const t = campaign.drafts.find((x) => String(x.candidateId) === d.candidateId && x.step === d.step);
    if (t) Object.assign(t, { subject: d.subject, body: d.body });
  }
  return campaign.save();
}

export async function approveCampaign(campaignId: string) {
  const campaign = await Campaign.findOneAndUpdate({ _id: campaignId, status: 'draft' }, { status: 'active' }, { returnDocument: 'after' });
  if (!campaign) throw new HttpError(409, 'Campaign is not a pending draft');
  const ids = [...new Set(campaign.drafts.map((d) => String(d.candidateId)))];
  await Promise.all(ids.map((candidateId) => enqueueStep({ campaignId, candidateId, step: 0 })));
  await logActivity({ jobId: campaign.jobId, type: 'campaign', actor: 'recruiter', via: 'chat', note: `Campaign approved for ${ids.length} candidates` });
  publish({ type: 'campaign', jobId: String(campaign.jobId), campaignId });
  return campaign;
}

export async function setCampaignStatus(campaignId: string, status: 'active' | 'paused' | 'cancelled') {
  const from: ('draft' | 'active' | 'paused')[] = status === 'active' ? ['paused'] : ['active', 'paused', 'draft'];
  const campaign = await Campaign.findOneAndUpdate({ _id: campaignId, status: { $in: from } }, { status }, { returnDocument: 'after' });
  if (!campaign) throw new HttpError(409, `Cannot set campaign to ${status}`);
  await logActivity({ jobId: campaign.jobId, type: 'campaign', actor: 'recruiter', via: 'ui', note: `Campaign ${status}` });
  publish({ type: 'campaign', jobId: String(campaign.jobId), campaignId });
  return campaign;
}
