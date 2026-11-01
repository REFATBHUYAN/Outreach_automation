import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import type { LlmProvider, ChatResult } from '../../src/services/llm/types';

// The only fake: a deterministic LLM. Mongo, Redis, BullMQ workers, HTTP and SSE are real.
const state = { jobId: '' };
const usage = { inputTokens: 100, outputTokens: 50 };
const reply = (text: string, calls: ChatResult['toolCalls'] = []): ChatResult => ({ text, toolCalls: calls, refusal: false, usage, raw: undefined });
const fakeLlm: LlmProvider = {
  model: 'fake',
  async chat({ turns }) {
    const last = turns[turns.length - 1];
    if (last.role !== 'user') return reply('Please review the card.');
    if (/job description/i.test(last.text))
      return reply('', [{ id: 'c1', name: 'propose_job', input: { title: 'Senior React Engineer', description: 'Build the console', mustHave: ['React', 'TypeScript'], niceToHave: ['Next.js'], seniority: 'Senior', location: 'Dhaka', salary: '', remotePolicy: 'Hybrid' } }]);
    if (/campaign/i.test(last.text))
      return reply('', [{ id: 'c2', name: 'propose_campaign', input: { jobId: state.jobId, steps: [{ day: 0 }, { day: 1 }] } }]);
    return reply('ok');
  },
  async json({ schema, prompt }) {
    const keys = Object.keys(schema.shape);
    let data: unknown;
    if (keys.includes('results')) data = { results: [...prompt.matchAll(/id=([a-f0-9]{24})/g)].map((m, i) => ({ id: m[1], score: 90 - i * 5, reason: 'Matches React', skills: ['React'] })) };
    else if (keys.includes('emails')) data = { emails: [...prompt.matchAll(/step (\d+) on day/g)].map((m) => ({ step: Number(m[1]), subject: `Role step ${m[1]}`, body: 'Hi there' })) };
    else if (keys.includes('queries')) data = { queries: ['site:linkedin.com/in "React" "Dhaka"', 'site:linkedin.com/in "TypeScript" "Next.js"'] };
    else if (keys.includes('remotePolicy')) data = { mustHave: ['React', 'TypeScript'], niceToHave: ['Next.js'], seniority: 'Senior', location: 'Dhaka', salary: '', remotePolicy: 'Hybrid' };
    else if (keys.includes('category')) data = { category: /meet|call/i.test(prompt) ? 'wants_meeting' : 'interested', subject: 'Re: role', body: 'Pick a time: link' };
    else data = { summary: 'All good' };
    return { data: schema.parse(data), usage };
  },
  // Web search: person A is found by every query (proves cross-query dedupe), B only by the second.
  async findProfiles(query) {
    const a = { name: 'Web Person A', url: 'https://www.linkedin.com/in/web-a', headline: 'React Engineer', company: 'Acme', location: 'Dhaka' };
    const b = { name: 'Web Person B', url: 'https://www.linkedin.com/in/web-b', headline: 'TypeScript Engineer', education: 'BUET' };
    return { profiles: /TypeScript/.test(query) ? [a, b] : [a], usage };
  },
};
vi.mock('../../src/services/llm/anthropic', () => ({ anthropicProvider: () => fakeLlm }));

const { default: mongoose } = await import('mongoose');
const { connectDb } = await import('../../src/config/db');
const { app } = await import('../../src/app');
const { startWorkers } = await import('../../src/queues/workers');
const { sourcingQueue, outreachQueue, replyQueue } = await import('../../src/queues/queues');
const { Job } = await import('../../src/models/Job');
const { Candidate } = await import('../../src/models/Candidate');
const { SendLog } = await import('../../src/models/SendLog');

let base = '';
let server: Server;
let workers: { close(): Promise<void> }[];
let sse = '';
const sseAbort = new AbortController();

const call = async <T = any>(path: string, init?: RequestInit & { json?: unknown }): Promise<{ status: number; body: T }> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: init?.json !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  return { status: res.status, body: await res.json() };
};
const post = (path: string, json: unknown = {}) => call(path, { method: 'POST', json });
const patchStatus = (id: string, status: string) => call(`/candidates/${id}/status`, { method: 'PATCH', json: { status } });
const messages = async () => (await call<any[]>('/messages')).body; // eslint-disable-line @typescript-eslint/no-explicit-any
const lastCard = async (type: string) => (await messages()).filter((m) => m.card?.type === type).pop();

async function until<T>(fn: () => Promise<T | undefined | null | false>, what: string, ms = 20_000): Promise<T> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for ${what}`);
}

beforeAll(async () => {
  await connectDb();
  await mongoose.connection.dropDatabase();
  await Promise.all([Candidate, SendLog].map((m) => m.syncIndexes()));
  await Promise.all([sourcingQueue, outreachQueue, replyQueue].map((q) => q.obliterate({ force: true })));
  workers = startWorkers();
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  void fetch(`${base}/events`, { signal: sseAbort.signal }).then(async (res) => {
    const reader = res.body!.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      sse += new TextDecoder().decode(value);
    }
  }).catch(() => undefined);
});

afterAll(async () => {
  sseAbort.abort();
  await Promise.all(workers.map((w) => w.close()));
  server.close();
  await mongoose.disconnect();
});

describe('full flow: JD → hire', () => {
  const ids: Record<string, string> = {};

  it('greets the recruiter', async () => {
    const ms = await messages();
    expect(ms[0].role).toBe('assistant');
    expect(ms[0].text).toMatch(/job description/i);
  });

  it('extracts a job into a confirmation card and writes nothing until confirmed', async () => {
    const { status, body } = await post('/chat', { text: 'Here is the job description: Senior React Engineer in Dhaka…' });
    expect(status).toBe(200);
    const card = body.find((m: any) => m.card?.type === 'job_confirm'); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(card.card.status).toBe('pending');
    expect(await Job.countDocuments()).toBe(0);

    const confirmed = await post(`/messages/${card._id}/action`, { action: 'confirm', data: { title: 'Senior React Engineer (edited)' } });
    expect(confirmed.body.card.status).toBe('confirmed');
    state.jobId = confirmed.body.card.data.jobId;
    expect((await Job.findById(state.jobId))!.title).toBe('Senior React Engineer (edited)');
    expect((await post(`/messages/${card._id}/action`, { action: 'confirm' })).status).toBe(409); // double click
  });

  it('writes several search queries, asks before sourcing, then merges and dedupes all results', async () => {
    const card = await lastCard('sourcing_confirm');
    expect(card.card.status).toBe('pending');
    expect(card.card.data.queries).toHaveLength(2);
    await post(`/messages/${card._id}/action`, { action: 'confirm' });
    const progress = await until(async () => {
      const p = await lastCard('sourcing_progress');
      return p?.card.data.done && p;
    }, 'web sourcing');
    expect(progress.card.data).toMatchObject({ found: 3, added: 2, scored: 2 });
    const a = await Candidate.findOne({ name: 'Web Person A' });
    expect(a).toMatchObject({ company: 'Acme', location: 'Dhaka', source: 'web', profileUrl: 'https://www.linkedin.com/in/web-a' });
    expect(a!.skills).toEqual(['React']);
  });

  it('imports the sample CSV in the background: dedupes and scores everyone', async () => {
    const form = new FormData();
    form.append('file', new Blob([readFileSync(`${__dirname}/../../seed/sample-candidates.csv`)], { type: 'text/csv' }), 'c.csv');
    const res = await call(`/jobs/${state.jobId}/candidates/csv`, { method: 'POST', body: form });
    expect(res.status).toBe(202);
    await until(async () => (await Candidate.countDocuments({ jobId: state.jobId, score: { $ne: null } })) === 9, 'scoring');
    expect(await Candidate.countDocuments({ jobId: state.jobId })).toBe(9); // 2 from web + 8 CSV rows minus 1 duplicate email
    const progress = await until(async () => {
      const p = (await messages()).filter((m) => m.card?.type === 'sourcing_progress' && m.card.data.found === 8).pop();
      return p?.card.data.done && p;
    }, 'csv progress card');
    expect(progress.card.data).toMatchObject({ found: 8, added: 7, scored: 7 });
    const { body } = await call<any[]>(`/jobs/${state.jobId}/candidates`); // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const c of body) ids[c.name.slice(-2)] = c._id;
    expect(body.every((c: { reason: string }) => c.reason === 'Matches React')).toBe(true);
  });

  it('review: accepts and rejects from the UI, enforcing the pipeline', async () => {
    for (const n of ['01', '02', '06']) expect((await patchStatus(ids[n], 'accepted')).status).toBe(200);
    expect((await patchStatus(ids['04'], 'rejected')).status).toBe(200);
    expect((await patchStatus(ids['03'], 'hired')).status).toBe(409);
  });

  it('creates a campaign with editable AI drafts; only accepted candidates with email are included', async () => {
    await post('/chat', { text: 'Create a campaign: day 0 and a follow-up on day 1' });
    const card = await lastCard('campaign_preview');
    const campaign = (await call(`/campaigns/${card.card.data.campaignId}`)).body;
    expect(campaign.status).toBe('draft');
    expect(new Set(campaign.drafts.map((d: { candidateId: string }) => d.candidateId))).toEqual(new Set([ids['01'], ids['02']]));
    expect(await SendLog.countDocuments()).toBe(0); // nothing sent before approval

    const drafts = campaign.drafts.map((d: { candidateId: string; step: number; subject: string }) =>
      d.candidateId === ids['01'] && d.step === 0 ? { ...d, subject: 'Edited subject' } : d);
    await post(`/messages/${card._id}/action`, { action: 'confirm', data: { drafts } });
    ids.campaign = campaign._id;
  });

  it('sends step 0, stops follow-ups once a candidate replies, and never sends a step twice', async () => {
    await until(async () => (await Candidate.findById(ids['01']))?.status === 'contacted', 'first email');
    const a = await Candidate.findById(ids['01']);
    expect(a!.thread[0].subject).toBe('Edited subject');

    expect((await post('/simulate-reply', { candidateId: ids['06'], body: 'hi' })).status).toBe(409); // never contacted
    await post('/simulate-reply', { candidateId: ids['01'], body: 'Sounds great — can we have a call this week?' });
    await until(async () => (await Candidate.findById(ids['01']))?.status === 'meeting_booked', 'reply classification');

    await until(async () => SendLog.exists({ candidateId: ids['02'], step: 1 }), 'follow-up to the silent candidate');
    await new Promise((r) => setTimeout(r, 1500));
    expect(await SendLog.countDocuments({ candidateId: ids['01'] })).toBe(1); // replied → follow-up stopped
    expect(await SendLog.countDocuments({ candidateId: ids['02'] })).toBe(2);
  });

  it('pauses and resumes the campaign', async () => {
    expect((await post(`/campaigns/${ids.campaign}/pause`)).body.status).toBe('paused');
    expect((await post(`/campaigns/${ids.campaign}/resume`)).body.status).toBe('active');
  });

  it('drafts a reply that waits for approval, then sends it', async () => {
    const card = await until(() => lastCard('reply_draft'), 'reply draft card');
    expect(card.card.data.category).toBe('wants_meeting');
    await post(`/messages/${card._id}/action`, { action: 'confirm', data: { subject: 'Re: role', body: 'Book here please' } });
    const a = await Candidate.findById(ids['01']);
    expect(a!.thread.at(-1)).toMatchObject({ direction: 'out', body: 'Book here please' });
    expect(a!.pendingReply?.body).toBeFalsy();
  });

  it('books a meeting through the mock slot picker', async () => {
    const { body } = await call(`/candidates/${ids['01']}/booking`);
    expect((await post(`/candidates/${ids['01']}/book`, { slot: body.slots[0] })).status).toBe(200);
    expect((await Candidate.findById(ids['01']))!.meetingAt).toBeTruthy();
  });

  it('moves interview → shortlist → hire, all in the activity log', async () => {
    for (const s of ['interviewed', 'shortlisted', 'hired']) expect((await patchStatus(ids['01'], s)).status).toBe(200);
    const log = (await call<any[]>(`/jobs/${state.jobId}/activity`)).body; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(log.filter((a) => a.candidateName === 'Sample Candidate 01' && a.type === 'status_change').map((a) => a.to).reverse())
      .toEqual(['accepted', 'contacted', 'replied', 'meeting_booked', 'interviewed', 'shortlisted', 'hired']);
  });

  it('reports dashboard stats and AI cost for the job', async () => {
    const { body } = await call(`/jobs/${state.jobId}`);
    expect(body.stats).toMatchObject({ total: 9, contacted: 2, replied: 1, replyRate: 50, interestedRate: 50, meetings: 1, hires: 1 });
    expect(body.usage.inputTokens).toBeGreaterThan(0);
    expect((await call(`/jobs/${state.jobId}/summary`)).body.summary).toBe('All good');
  });

  it('creates a job manually, writes queries with AI, and sources from the job page', async () => {
    const created = await post('/jobs', { title: 'Platform Engineer', description: 'Go, Kubernetes, Dhaka. 5+ years.' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'Platform Engineer', mustHave: ['React', 'TypeScript'], location: 'Dhaka' });
    const jobId = created.body._id;
    const { body: q } = await post(`/jobs/${jobId}/queries`);
    expect(q.queries.length).toBeGreaterThan(1);
    expect((await post(`/jobs/${jobId}/source`, { queries: [] })).status).toBe(400);
    expect((await post(`/jobs/${jobId}/source`, { queries: q.queries })).status).toBe(202);
    await until(async () => (await call(`/jobs/${jobId}/sourcing`)).body?.card.data.done, 'job-page sourcing');
    const { body: cs } = await call<any[]>(`/jobs/${jobId}/candidates`); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(cs.map((c) => c.name).sort()).toEqual(['Web Person A', 'Web Person B']);
    expect(cs.find((c) => c.name === 'Web Person B')).toMatchObject({ education: 'BUET', query: q.queries[1] });
  });

  it('"New chat" hides the conversation but keeps jobs, candidates and sourcing progress', async () => {
    const before = (await call<any[]>(`/jobs/${state.jobId}/candidates`)).body.length; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { body } = await post('/messages/clear');
    expect(body).toHaveLength(1);
    expect(body[0].text).toMatch(/job description/i);
    expect(await messages()).toHaveLength(1);
    expect((await call<any[]>(`/jobs/${state.jobId}/candidates`)).body).toHaveLength(before); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect((await call(`/jobs/${state.jobId}/sourcing`)).body.card.type).toBe('sourcing_progress');
  });

  it('pushed live updates over SSE, including job creation', () => {
    expect(sse).toContain('"type":"message"');
    expect(sse).toContain('"type":"job"');
  });
});
