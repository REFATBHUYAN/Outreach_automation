import { z } from 'zod';
import { ah, HttpError, validate } from '../middleware/errors';
import { Campaign } from '../models/Campaign';
import { setCampaignStatus, updateDrafts } from '../services/campaigns.service';

export const getCampaign = ah(async (req, res) => {
  const c = await Campaign.findById(req.params.id).lean();
  if (!c) throw new HttpError(404, 'Campaign not found');
  res.json(c);
});

export const saveDrafts = ah(async (req, res) => {
  const drafts = validate(z.array(z.object({ candidateId: z.string(), step: z.number(), subject: z.string(), body: z.string() })), req.body.drafts);
  res.json(await updateDrafts(req.params.id, drafts));
});

export const pause = ah(async (req, res) => res.json(await setCampaignStatus(req.params.id, 'paused')));
export const resume = ah(async (req, res) => res.json(await setCampaignStatus(req.params.id, 'active')));
