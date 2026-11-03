// Live end-to-end run against the running app (npm run dev): real LLM, real search, real SMTP if configured.
// Usage: node scripts/live-flow.mjs [candidates.csv]   (default: backend/seed/my-candidates.local.csv)
// Sends real emails to every address in the CSV when SMTP_URL is set. Use only addresses you own.
import { readFileSync } from 'node:fs';

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const CSV = process.argv[2] ?? 'backend/seed/my-candidates.local.csv';
const FOLLOWUP_WAIT_S = Number(process.env.FOLLOWUP_WAIT_S ?? 150);

const log = (step, msg) => console.log(`\n[${step}] ${msg}`);
const fail = (msg) => { console.error(`\n✗ ${msg}`); process.exit(1); };
async function call(path, init = {}) {
  const res = await fetch(`${API}${path}`, init.json === undefined ? init : { ...init, method: init.method ?? 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(init.json) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(`${init.method ?? 'GET'} ${path} → ${res.status} ${body.error ?? ''}`);
  return body;
}
async function until(fn, what, seconds = 180) {
  for (const end = Date.now() + seconds * 1000; Date.now() < end; await new Promise((r) => setTimeout(r, 2000))) {
    const v = await fn();
    if (v) return v;
  }
  fail(`timed out after ${seconds}s waiting for: ${what}`);
}
const candidates = (jobId) => call(`/jobs/${jobId}/candidates`);
async function emailFailure(jobId) {
  const f = (await call(`/jobs/${jobId}/activity`)).find((a) => a.type === 'email_failed');
  if (f) fail(`email sending failed — ${f.note}`);
}

await call('/../health').catch(() => fail(`API not reachable at ${API}. Start it with npm run dev.`));

log(1, 'Create job from the sample JD');
const job = await call('/jobs', { json: { title: 'Senior React Engineer', description: readFileSync('backend/seed/sample-jd.txt', 'utf8') } });
console.log(`  must-have: ${job.mustHave.join(', ')} · ${job.location}`);

log(2, `Upload ${CSV}`);
const form = new FormData();
form.append('file', new Blob([readFileSync(CSV)], { type: 'text/csv' }), 'candidates.csv');
const { rows } = await call(`/jobs/${job._id}/candidates/csv`, { method: 'POST', body: form });
const scored = await until(async () => { const cs = await candidates(job._id); return cs.length === rows && cs.every((c) => c.score != null) && cs; }, 'AI scoring');
for (const c of scored) console.log(`  ${c.score}  ${c.name} <${c.email}> — ${c.reason}`);

log(3, 'Accept everyone with an email');
const people = scored.filter((c) => c.email);
for (const c of people) await call(`/candidates/${c._id}/status`, { method: 'PATCH', json: { status: 'accepted' } });

log(4, 'AI writes a Day 0 + Day 1 campaign; approve it');
const campaign = await call(`/jobs/${job._id}/campaigns`, { json: { steps: [{ day: 0 }, { day: 1, instructions: 'short friendly follow-up' }], dailyLimit: 10 } });
for (const d of campaign.drafts) console.log(`  step ${d.step + 1} → ${d.email}: "${d.subject}"`);
await call(`/campaigns/${campaign._id}/approve`, { json: { drafts: campaign.drafts } });

log(5, 'Wait for the first emails to send');
await until(async () => { await emailFailure(job._id); return (await candidates(job._id)).filter((c) => c.status === 'contacted').length === people.length; }, 'step 1 sent to everyone');
console.log(`  sent to: ${people.map((c) => c.email).join(', ')}`);

const [replier, silent] = people;
log(6, `${replier.name} replies; AI classifies and drafts an answer`);
await call('/simulate-reply', { json: { candidateId: replier._id, body: 'Sounds great — could we have a quick call this week to discuss the role?' } });
const replied = await until(async () => (await candidates(job._id)).find((c) => c._id === replier._id && c.pendingReply?.body), 'reply classification');
console.log(`  classified: ${replied.replyClass} · status: ${replied.status}\n  draft: "${replied.pendingReply.subject}"`);
await call(`/candidates/${replier._id}/reply`, { json: replied.pendingReply });
console.log(`  reply sent to ${replier.email}`);

log(7, 'Book a meeting through the booking link');
const { slots } = await call(`/candidates/${replier._id}/booking`);
await call(`/candidates/${replier._id}/book`, { json: { slot: slots[0] } });
console.log(`  booked ${slots[0]}`);

log(8, 'Interview → shortlist → hire');
for (const status of ['interviewed', 'shortlisted', 'hired']) await call(`/candidates/${replier._id}/status`, { method: 'PATCH', json: { status } });

if (silent) {
  log(9, `Follow-up (Day 1) goes only to ${silent.name}, who did not reply — waiting up to ${FOLLOWUP_WAIT_S}s (set OUTREACH_DAY_MS=60000 for a 1-minute "day")`);
  await until(async () => { await emailFailure(job._id); return (await candidates(job._id)).find((c) => c._id === silent._id && c.thread.some((t) => t.step === 1)); }, 'follow-up email', FOLLOWUP_WAIT_S);
  const r = (await candidates(job._id)).find((c) => c._id === replier._id);
  console.log(`  follow-up sent to ${silent.email}; ${replier.name} got ${r.thread.filter((t) => t.step === 1).length} follow-ups (expected 0: replying stops them)`);
}

const { stats, usage } = await call(`/jobs/${job._id}`);
log('done', `contacted ${stats.contacted} · replied ${stats.replied} (${stats.replyRate}%) · meetings ${stats.meetings} · hires ${stats.hires} · AI cost $${usage.costUsd.toFixed(3)}`);
console.log(`  open http://localhost:5173/jobs/${job._id}`);
