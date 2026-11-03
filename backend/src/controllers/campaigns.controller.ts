import { z } from 'zod';
import { ah, HttpError, validate } from '../middleware/errors';
import { Campaign } from '../models/Campaign';
import { approveCampaign, createDraftCampaign, setCampaignStatus, updateDrafts } from '../services/campaigns.service';

const draftsSchema = z.array(z.object({ candidateId: z.string(), step: z.number(), subject: z.string().min(1), body: z.string().min(1) }));

export const getCampaign = ah(async (req, res) => {
  const c = await Campaign.findById(req.params.id).lean();
  if (!c) throw new HttpError(404, 'Campaign not found');
  res.json(c);
});

export const saveDrafts = ah(async (req, res) => {
  const drafts = validate(draftsSchema, req.body.drafts);
  res.json(await updateDrafts(req.params.id, drafts));
});

/** Draft campaign from the job page: AI writes personalised emails; nothing is sent until approve. */
export const create = ah(async (req, res) => {
  const { steps, dailyLimit } = validate(z.object({
    steps: z.array(z.object({ day: z.number().int().min(0).max(60), instructions: z.string().max(500).optional() })).min(1).max(5),
    dailyLimit: z.number().int().min(1).max(500).optional(),
  }), req.body);
  res.status(201).json(await createDraftCampaign(req.params.id, steps, dailyLimit));
});

/** The recruiter's explicit approval from the UI: saves any edits, then starts sending. */
export const approve = ah(async (req, res) => {
  const drafts = validate(draftsSchema.optional(), req.body?.drafts);
  if (drafts?.length) await updateDrafts(req.params.id, drafts);
  res.json(await approveCampaign(req.params.id));
});

export const cancel = ah(async (req, res) => res.json(await setCampaignStatus(req.params.id, 'cancelled')));

export const pause = ah(async (req, res) => res.json(await setCampaignStatus(req.params.id, 'paused')));
export const resume = ah(async (req, res) => res.json(await setCampaignStatus(req.params.id, 'active')));
