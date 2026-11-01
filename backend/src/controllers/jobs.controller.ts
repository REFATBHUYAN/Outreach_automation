import { z } from 'zod';
import { ah, HttpError, validate } from '../middleware/errors';
import { Job } from '../models/Job';
import { Candidate } from '../models/Candidate';
import { Activity } from '../models/Activity';
import { Campaign } from '../models/Campaign';
import { computeStats } from '../services/stats';
import { allowedNext, type Status } from '../services/pipeline';
import { extractJob, generateQueries, summarizeJob } from '../services/ai.service';
import { parseCandidatesCsv } from '../services/csv';
import { logActivity } from '../services/candidates.service';
import { startSourcing } from '../services/actions.service';
import { Message } from '../models/Message';
import { publish } from '../services/events';

const statsFor = async (jobId: string) => computeStats((await Candidate.find({ jobId }, { status: 1, reached: 1 }).lean()) as never);
const findJob = async (id: string) => {
  const job = await Job.findById(id).lean();
  if (!job) throw new HttpError(404, 'Job not found');
  return job;
};

export const listJobs = ah(async (_req, res) => {
  const jobs = await Job.find().sort({ createdAt: -1 }).lean();
  res.json(await Promise.all(jobs.map(async (j) => ({ ...j, stats: await statsFor(String(j._id)) }))));
});

/** Manual job creation from the UI: title + description; the AI fills the structured fields when it can. */
export const createJob = ah(async (req, res) => {
  const { title, description } = validate(z.object({ title: z.string().trim().min(1).max(200), description: z.string().trim().min(1).max(30_000) }), req.body);
  const fields = await extractJob(title, description).catch(() => ({}));
  const job = await Job.create({ title, description, mustHave: [], niceToHave: [], ...fields });
  await logActivity({ jobId: job._id, type: 'job', actor: 'recruiter', via: 'ui', note: `Job "${title}" created` });
  publish({ type: 'job', jobId: String(job._id) });
  res.status(201).json(job);
});

/** AI-written search queries, saved on the job so the recruiter can edit them before searching. */
export const createQueries = ah(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found');
  job.searchQueries = await generateQueries(job, req.params.id);
  await job.save();
  res.json({ queries: job.searchQueries });
});

/** Starting a search from the job page is an explicit recruiter action, so it runs directly. */
export const source = ah(async (req, res) => {
  const { queries } = validate(z.object({ queries: z.array(z.string().trim().min(3).max(300)).min(1).max(8) }), req.body);
  await findJob(req.params.id);
  await Job.updateOne({ _id: req.params.id }, { searchQueries: queries });
  const progress = await startSourcing(req.params.id, { queries, useWeb: true });
  res.status(202).json(progress);
});

export const scoreUnscored = ah(async (req, res) => {
  await findJob(req.params.id);
  res.status(202).json(await startSourcing(req.params.id, { rescoreOnly: true }));
});

export const latestSourcing = ah(async (req, res) =>
  res.json(await Message.findOne({ jobId: req.params.id, 'card.type': 'sourcing_progress' }).sort({ createdAt: -1 }).lean()));

export const getJob = ah(async (req, res) => res.json({ ...(await findJob(req.params.id)), stats: await statsFor(req.params.id) }));

export const updateJob = ah(async (req, res) => {
  const patch = validate(z.object({ autoReply: z.boolean() }).partial(), req.body);
  const job = await Job.findByIdAndUpdate(req.params.id, patch, { returnDocument: 'after' });
  if (!job) throw new HttpError(404, 'Job not found');
  publish({ type: 'job', jobId: req.params.id });
  res.json(job);
});

export const listCandidates = ah(async (req, res) => {
  const cs = await Candidate.find({ jobId: req.params.id }).sort({ score: -1, createdAt: 1 }).lean();
  res.json(cs.map((c) => ({ ...c, allowedNext: allowedNext(c.status as Status) })));
});

export const listActivity = ah(async (req, res) =>
  res.json(await Activity.find({ jobId: req.params.id }).sort({ createdAt: -1 }).limit(200).lean()));

export const listCampaigns = ah(async (req, res) =>
  res.json(await Campaign.find({ jobId: req.params.id }).sort({ createdAt: -1 }).lean()));

export const summary = ah(async (req, res) => {
  const job = await findJob(req.params.id);
  res.json({ summary: await summarizeJob(job, await statsFor(req.params.id), req.params.id) });
});

/** CSV upload is an explicit recruiter action, so it starts sourcing directly (dedupe + scoring in the background). */
export const uploadCsv = ah(async (req, res) => {
  await findJob(req.params.id);
  if (!req.file) throw new HttpError(400, 'Attach a CSV file as "file"');
  const rows = parseCandidatesCsv(req.file.buffer.toString('utf8'));
  if (!rows.length) throw new HttpError(400, 'No rows with a name column found');
  await startSourcing(req.params.id, { rows });
  res.status(202).json({ rows: rows.length });
});
