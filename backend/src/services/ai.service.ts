import { z } from 'zod';
import { callJson } from './llm';
import { untrusted, type ReplyClass } from './safety';
import type { JobDoc } from '../models/Job';
import type { JobStats } from './stats';

type JobLike = Pick<JobDoc, 'title' | 'mustHave' | 'niceToHave' | 'seniority' | 'location' | 'remotePolicy' | 'salary'>;
interface Profile { id: string; name: string; headline?: string | null; location?: string | null; profileUrl?: string | null; company?: string | null; education?: string | null; summary?: string | null }

const jobBrief = (j: JobLike) =>
  `Job: ${j.title} (${j.seniority ?? 'any seniority'}), ${j.location ?? 'any location'}, ${j.remotePolicy ?? ''}\nMust have: ${j.mustHave?.join(', ')}\nNice to have: ${j.niceToHave?.join(', ')}`;

const NO_INVENTION = 'Use only the information given. Never invent facts about a candidate; if something is unknown, say so.';

/** Structured job fields from a pasted description. Unknown fields stay empty. */
export async function extractJob(title: string, description: string) {
  return callJson({
    schema: z.object({
      mustHave: z.array(z.string()), niceToHave: z.array(z.string()),
      seniority: z.string(), location: z.string(), salary: z.string(), remotePolicy: z.string(),
    }),
    system: `Extract structured fields from a job description. ${NO_INVENTION} Use an empty string or empty list when the JD does not say.`,
    prompt: `Title: ${title}\n\n${untrusted('job_description', description)}`,
  });
}

/** 3–5 Google queries that find matching public LinkedIn profiles, from narrow to broad. */
export async function generateQueries(job: JobLike & { description?: string | null }, jobId: string) {
  const out = await callJson({
    jobId,
    schema: z.object({ queries: z.array(z.string()).min(1).max(5) }),
    system: `You write Google search queries that find public LinkedIn profiles of people who fit a job.
Every query starts with site:linkedin.com/in followed by 2 to 4 short quoted keywords: a role title or close synonym, one or two core skills (single words like "React", not phrases), and the city when the job has one.
More keywords means fewer results, so keep queries short. Write 3 to 5 queries from most specific to broadest, each a different angle (alternate titles, different core skill). No explanations.`,
    prompt: `${jobBrief(job)}\n\n${untrusted('job_description', job.description ?? '')}`,
  });
  return [...new Set(out.queries.map((q) => q.trim()).filter(Boolean))];
}

export async function scoreCandidates(job: JobLike, profiles: Profile[], jobId: string) {
  const out = await callJson({
    jobId,
    schema: z.object({ results: z.array(z.object({ id: z.string(), score: z.number().int().min(0).max(100), reason: z.string(), skills: z.array(z.string()).describe('Skills explicitly shown in the profile text; empty if none') })) }),
    system: `You score candidates 0-100 against a job. Give a one-sentence reason grounded in the profile. ${NO_INVENTION} A sparse profile gets a low-confidence middle score and a reason saying information is missing.`,
    prompt: `${jobBrief(job)}\n\nCandidates:\n${profiles.map((p) => `id=${p.id}\n${untrusted('profile', [p.name, p.headline, p.company && `Company: ${p.company}`, p.location && `Location: ${p.location}`, p.education && `Education: ${p.education}`, p.summary].filter(Boolean).join('\n'))}`).join('\n')}`,
  });
  return out.results;
}

export async function draftOutreach(job: JobLike, c: Profile, steps: { day: number; instructions?: string | null }[], jobId: string) {
  const out = await callJson({
    jobId,
    schema: z.object({ emails: z.array(z.object({ step: z.number().int(), subject: z.string(), body: z.string() })) }),
    system: `You write short, warm, personalised recruiting emails from a recruiter. Step 0 is the first email; later steps are polite follow-ups that reference the earlier email. ${NO_INVENTION} Sign off as "The Recruiting Team". Plain text, no placeholders.`,
    prompt: `${jobBrief(job)}\n\nSteps: ${steps.map((s, i) => `step ${i} on day ${s.day}${s.instructions ? ` (${s.instructions})` : ''}`).join('; ')}\n\nCandidate:\n${untrusted('profile', `${c.name} — ${c.headline ?? ''}`)}`,
  });
  return out.emails;
}

export async function classifyReply(job: JobLike, c: Profile, reply: string, bookingLink: string, jobId: string) {
  return callJson({
    jobId,
    schema: z.object({
      category: z.enum(['interested', 'not_interested', 'question', 'wants_meeting', 'unsubscribe']),
      subject: z.string(),
      body: z.string(),
    }),
    system: `Classify a candidate's reply to recruiting outreach, then draft the recruiter's response.
- wants_meeting: they ask for or agree to a call/meeting → include this booking link: ${bookingLink}
- interested: positive but no meeting yet → propose a call with the same booking link.
- question: answer only from the job details; if the answer is not there, say the recruiter will confirm.
- not_interested: thank them briefly.
- unsubscribe: they ask to stop → body must be empty.
${NO_INVENTION}`,
    prompt: `${jobBrief(job)}\n\nCandidate: ${c.name}\nReply:\n${untrusted('email', reply)}`,
  }) as Promise<{ category: ReplyClass; subject: string; body: string }>;
}

export async function summarizeJob(job: JobLike, stats: JobStats, jobId: string) {
  const out = await callJson({
    jobId,
    schema: z.object({ summary: z.string() }),
    system: 'You are a recruiting analyst. Summarise hiring progress in 3-5 sentences: where the funnel stands, what is working, and the next best action. Use only the numbers given.',
    prompt: `${jobBrief(job)}\n\nStats: ${JSON.stringify(stats)}`,
  });
  return out.summary;
}
