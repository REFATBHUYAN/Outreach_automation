import { z } from 'zod';
import { Job } from '../models/Job';
import { Candidate } from '../models/Candidate';
import { Campaign } from '../models/Campaign';
import { cards, type Card } from '../views/cards';
import { canTransition, allowedNext, STATUSES, type Status } from '../services/pipeline';
import { computeStats } from '../services/stats';
import { fetchPageText } from '../services/search.service';
import { createDraftCampaign } from '../services/campaigns.service';
import { untrusted } from '../services/safety';
import type { ToolSpec } from '../services/llm';

/** Cards produced during one agent turn; persisted after the assistant's reply text. */
export interface AgentCtx { cards: { card: Card; jobId?: string }[]; jobId?: string }

interface ToolDef<S extends z.ZodObject> { description: string; input: S; run: (args: z.infer<S>, ctx: AgentCtx) => Promise<unknown> }
const tool = <S extends z.ZodObject>(t: ToolDef<S>) => t;

const id = z.string().regex(/^[a-f0-9]{24}$/, 'must be a 24-char id');
const show = (ctx: AgentCtx, card: Card, jobId?: string) => {
  ctx.cards.push({ card, jobId });
  if (jobId) ctx.jobId = jobId;
  return card.status === 'pending'
    ? `A confirmation card is now shown to the recruiter. Nothing has been written yet; it happens only when they click Confirm.`
    : 'Card shown to the recruiter.';
};
const getJob = async (jobId: string) => {
  const job = await Job.findById(jobId);
  if (!job) throw new Error(`No job with id ${jobId}. Call list_jobs.`);
  return job;
};

// Read tools run immediately. Every tool that would write or send only creates a confirmation card:
// the write happens in actions.service when the recruiter confirms. This is how "confirm before any write" is enforced.
export const TOOLS = {
  list_jobs: tool({
    description: 'List all jobs with their ids and candidate counts.',
    input: z.object({}),
    run: async () => {
      const jobs = await Job.find().sort({ createdAt: -1 }).lean();
      return Promise.all(jobs.map(async (j) => ({ id: String(j._id), title: j.title, location: j.location, candidates: await Candidate.countDocuments({ jobId: j._id }) })));
    },
  }),
  read_jd_link: tool({
    description: 'Fetch the text of a job description from a URL the recruiter gave.',
    input: z.object({ url: z.string().url() }),
    run: async ({ url }) => untrusted('web_page', await fetchPageText(url)),
  }),
  propose_job: tool({
    description: 'Show an editable job confirmation card with the fields extracted from the JD. The job is created only after the recruiter confirms. Leave a field empty if the JD does not state it.',
    input: z.object({
      title: z.string(), description: z.string().describe('Short summary of the role'),
      mustHave: z.array(z.string()), niceToHave: z.array(z.string()),
      seniority: z.string(), location: z.string(), salary: z.string(), remotePolicy: z.string(),
    }),
    run: async (job, ctx) => show(ctx, cards.jobConfirm(job)),
  }),
  propose_sourcing: tool({
    description: 'Ask the recruiter to confirm background sourcing: several Google queries for public LinkedIn profiles, then dedupe and scoring. Write 3-5 queries like: site:linkedin.com/in "React" "TypeScript" "Dhaka"',
    input: z.object({ jobId: id, queries: z.array(z.string()).min(1).max(5) }),
    run: async ({ jobId, queries }, ctx) => (await getJob(jobId), show(ctx, cards.sourcingConfirm(jobId, queries), jobId)),
  }),
  propose_scoring: tool({
    description: 'Ask to confirm (re)scoring all unscored candidates of a job in the background.',
    input: z.object({ jobId: id }),
    run: async ({ jobId }, ctx) => show(ctx, cards.scoringConfirm(jobId), jobId),
  }),
  list_candidates: tool({
    description: 'List candidates of a job sorted by score (highest first), optionally filtered by status.',
    input: z.object({ jobId: id, status: z.enum(STATUSES).optional(), limit: z.number().int().max(200).optional() }),
    run: async ({ jobId, status, limit }) => {
      const cs = await Candidate.find({ jobId, ...(status && { status }) }).sort({ score: -1 }).limit(limit ?? 50).lean();
      return cs.map((c) => ({ id: String(c._id), name: c.name, status: c.status, score: c.score ?? null, hasEmail: !!c.email, reason: c.reason, profile: untrusted('profile', c.headline ?? '') }));
    },
  }),
  find_candidate: tool({
    description: 'Find candidates by (partial) name across jobs.',
    input: z.object({ name: z.string(), jobId: id.optional() }),
    run: async ({ name, jobId }) => {
      const rx = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const cs = await Candidate.find({ name: rx, ...(jobId && { jobId }) }).limit(10).lean();
      return cs.map((c) => ({ id: String(c._id), jobId: String(c.jobId), name: c.name, status: c.status, allowedNext: allowedNext(c.status as Status) }));
    },
  }),
  show_candidates: tool({
    description: 'Show the interactive candidate review table (score, reason, profile link, accept/reject buttons).',
    input: z.object({ jobId: id }),
    run: async ({ jobId }, ctx) => show(ctx, cards.candidateTable(jobId), jobId),
  }),
  propose_decisions: tool({
    description: 'Propose accepting/rejecting candidates (e.g. "accept the top 5"). Use list_candidates first to get ids. Applied only after confirmation.',
    input: z.object({ jobId: id, decisions: z.array(z.object({ candidateId: id, decision: z.enum(['accepted', 'rejected']) })).min(1) }),
    run: async ({ jobId, decisions }, ctx) => {
      const cs = await Candidate.find({ jobId, _id: { $in: decisions.map((d) => d.candidateId) } }).lean();
      const valid = decisions.flatMap((d) => {
        const c = cs.find((x) => String(x._id) === d.candidateId);
        return c && canTransition(c.status as Status, d.decision) ? [{ ...d, name: c.name }] : [];
      });
      if (!valid.length) return 'None of these candidates can take that decision from their current status.';
      return show(ctx, cards.decisionConfirm(jobId, valid), jobId) + ` (${decisions.length - valid.length} skipped as invalid)`;
    },
  }),
  propose_campaign: tool({
    description: 'Create a DRAFT outreach campaign: single email (one step on day 0) or a sequence, e.g. days [0,3,7]. Only accepted candidates with an email are included. The AI writes personalised drafts that the recruiter previews, edits and approves; nothing is sent before approval.',
    input: z.object({
      jobId: id,
      steps: z.array(z.object({ day: z.number().int().min(0), instructions: z.string().optional() })).min(1),
      dailyLimit: z.number().int().min(1).optional(),
      candidateIds: z.array(id).optional().describe('Defaults to all accepted candidates with email'),
    }),
    run: async ({ jobId, steps, dailyLimit, candidateIds }, ctx) => {
      const campaign = await createDraftCampaign(jobId, steps, dailyLimit, candidateIds);
      return show(ctx, cards.campaignPreview(String(campaign._id), jobId), jobId);
    },
  }),
  list_campaigns: tool({
    description: 'List campaigns of a job with status and number of recipients.',
    input: z.object({ jobId: id }),
    run: async ({ jobId }) => (await Campaign.find({ jobId }).lean()).map((c) => ({
      id: String(c._id), status: c.status, steps: c.steps, recipients: new Set(c.drafts.map((d) => String(d.candidateId))).size,
    })),
  }),
  show_pending_reply: tool({
    description: "Show a candidate's AI-drafted reply for the recruiter to edit and approve sending.",
    input: z.object({ candidateId: id }),
    run: async ({ candidateId }, ctx) => {
      const c = await Candidate.findById(candidateId);
      if (!c?.pendingReply?.body) return 'This candidate has no pending reply draft.';
      const inbound = [...c.thread].reverse().find((t) => t.direction === 'in')?.body ?? '';
      return show(ctx, cards.replyDraft({ candidateId, name: c.name, inbound, category: c.replyClass ?? '', flagged: !!c.flagged, subject: c.pendingReply.subject ?? '', body: c.pendingReply.body }), String(c.jobId));
    },
  }),
  propose_status_change: tool({
    description: 'Propose changing a candidate status (e.g. "mark Rahim as hired"). Use find_candidate first. Applied only after confirmation and logged in the activity log.',
    input: z.object({ candidateId: id, status: z.enum(STATUSES), note: z.string().optional() }),
    run: async ({ candidateId, status, note }, ctx) => {
      const c = await Candidate.findById(candidateId);
      if (!c) return 'Candidate not found.';
      if (!canTransition(c.status as Status, status)) return `Not allowed: ${c.name} is ${c.status}; allowed next: ${allowedNext(c.status as Status).join(', ') || 'none'}.`;
      return show(ctx, cards.statusConfirm({ candidateId, name: c.name, from: c.status, to: status, note }), String(c.jobId));
    },
  }),
  get_stats: tool({
    description: 'Get funnel counts per status, reply rate, interested rate, meetings, hires and AI cost for a job, and show the stats card. Use it to answer "how is the X job going?".',
    input: z.object({ jobId: id }),
    run: async ({ jobId }, ctx) => {
      const job = await getJob(jobId);
      const stats = computeStats(await Candidate.find({ jobId }, { status: 1, reached: 1 }).lean() as never);
      show(ctx, cards.stats(jobId), jobId);
      return { job: job.title, ...stats, aiCostUsd: job.usage?.costUsd };
    },
  }),
};

type ToolName = keyof typeof TOOLS;

export const toolDefinitions: ToolSpec[] = Object.entries(TOOLS).map(([name, t]) => {
  const { $schema: _, ...parameters } = z.toJSONSchema(t.input);
  return { name, description: t.description, parameters };
});

/** Validates the model's arguments, runs the tool, and turns any failure into an error result the model can read. */
export async function runTool(name: string, input: unknown, ctx: AgentCtx): Promise<{ content: string; is_error?: boolean }> {
  const t = TOOLS[name as ToolName] as ToolDef<z.ZodObject> | undefined;
  if (!t) return { content: `Unknown tool ${name}`, is_error: true };
  try {
    const out = await t.run(t.input.parse(input), ctx);
    return { content: typeof out === 'string' ? out : JSON.stringify(out) };
  } catch (e) {
    return { content: e instanceof z.ZodError ? `Invalid arguments: ${e.message}` : (e as Error).message, is_error: true };
  }
}
