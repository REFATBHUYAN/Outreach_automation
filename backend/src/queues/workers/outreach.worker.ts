import { DelayedError, type Job as BullJob } from 'bullmq';
import { Campaign } from '../../models/Campaign';
import { Candidate } from '../../models/Candidate';
import { SendLog } from '../../models/SendLog';
import { env } from '../../config/env';
import { sendMail } from '../../services/mailer';
import { changeStatus, logActivity } from '../../services/candidates.service';
import { nextDayStart, shouldSend, startOfDay, stepDelay } from '../../services/outreach';
import { enqueueStep, type OutreachData } from '../queues';

const PAUSE_RECHECK_MS = 60_000;

export async function processOutreach(bull: BullJob<OutreachData>, token?: string) {
  const { campaignId, candidateId, step } = bull.data;
  const campaign = await Campaign.findById(campaignId);
  if (!campaign || campaign.status === 'cancelled' || campaign.status === 'draft') return 'skipped: campaign inactive';
  if (campaign.status === 'paused') {
    await bull.moveToDelayed(Date.now() + PAUSE_RECHECK_MS, token);
    throw new DelayedError();
  }
  const c = await Candidate.findById(candidateId);
  // Replies and unsubscribes move the candidate off `contacted`, which stops all follow-ups here.
  if (!c || !shouldSend(c, step)) return 'skipped: candidate not eligible';

  const sentToday = await SendLog.countDocuments({ campaignId, sentAt: { $gte: startOfDay() } });
  if (sentToday >= (campaign.dailyLimit ?? env.DAILY_SEND_LIMIT)) {
    await bull.moveToDelayed(nextDayStart().getTime(), token);
    throw new DelayedError();
  }
  const draft = campaign.drafts.find((d) => String(d.candidateId) === candidateId && d.step === step);
  if (!draft) return 'skipped: no draft';

  try {
    await SendLog.create({ campaignId, candidateId, step });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return 'skipped: step already sent';
    throw e;
  }
  try {
    await sendMail(c.email!, draft.subject!, draft.body!);
  } catch (e) {
    await SendLog.deleteOne({ campaignId, candidateId, step }); // let the retry send it
    throw e;
  }
  await Candidate.updateOne({ _id: candidateId }, { $push: { thread: { direction: 'out', subject: draft.subject, body: draft.body, step } } });
  await logActivity({ jobId: c.jobId, candidateId: c._id, candidateName: c.name, type: 'email_sent', actor: 'system', via: 'worker', note: `Step ${step}: ${draft.subject}` });
  if (step === 0) await changeStatus(candidateId, 'contacted', { actor: 'system', via: 'worker', note: 'First outreach email sent' });
  if (step + 1 < campaign.steps.length) await enqueueStep({ campaignId, candidateId, step: step + 1 }, stepDelay(campaign.steps as { day: number }[], step + 1, env.OUTREACH_DAY_MS));
  return 'sent';
}
