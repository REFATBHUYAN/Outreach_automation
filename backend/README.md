# AI Recruiting Co-Worker — Backend

Chat-first AI assistant that runs a recruiter's hiring process: **JD → Job → Sourcing → Review → Outreach → AI replies → Meeting booked → Interview → Shortlist → Hired → Stats.**

Stack: Node.js + Express (TypeScript), BullMQ + Redis, MongoDB (Mongoose), and plain tool calling with **Anthropic Claude or OpenAI**, chosen by `LLM_PROVIDER`. Frontend: [`../frontend`](../frontend) (React 18 + TypeScript).

## Run it

From the root folder (the one holding `backend/` and `frontend/`), see the root README:

```bash
npm install && npm run dev   # Mongo + Redis in Docker, API + workers :4000, UI :5173
npm test                     # unit + end-to-end (real Mongo/Redis/BullMQ, fake LLM)
npm run docker:up            # whole stack in containers
```

Backend on its own: `cp .env.example .env && npm install`, `docker compose -f docker-compose.infra.yml up -d --wait`, then `npm run dev`, `npm test` (unit, no infra) and `npm run test:e2e` (needs the infra). Workers run inside the API process; set `WORKERS=off` and run `npm run worker` to split them.

**Seed data:** `seed/sample-jd.txt` (paste into chat) and `seed/sample-candidates.csv` (upload from the candidate table; includes a duplicate row to show dedupe). For a fast demo set `OUTREACH_DAY_MS=60000` so a Day 0/3/7 sequence runs in 0/3/7 minutes.

## Finding candidates (job page)

1. **New job**: enter a title and paste the description. The AI extracts must-have / nice-to-have skills, seniority, location, salary and remote policy.
2. **Write queries with AI**: 3–5 short Google queries (`site:linkedin.com/in "Senior React Developer" "Redux" "Dhaka"`), from specific to broad. Edit, add or remove them.
3. **Search**: every query runs in a background job, results are merged and deduplicated (email / normalised profile URL), then scored 0–100 with a reason and the skills the profile shows.
4. Each candidate keeps everything the search exposed: name, LinkedIn URL, headline, company, location, education, summary, skills and the query that found them.

Search runs on **Serper** when `SERPER_API_KEY` is set. Otherwise it uses the LLM provider's own web search (**OpenAI** Responses `web_search` or **Claude** `web_search`), restricted to linkedin.com. The model returns structured profiles, and `services/llm/profiles.ts` keeps a profile only if its URL actually appeared in the search sources — invented candidates are dropped. The same flow is available from chat ("find candidates") with a confirmation card.

## Architecture

```
React (chat + cards, job page, dashboard)  ──REST──▶  Express API (MVC)  ──▶ MongoDB
          ▲                                                │  ▲
          └──────────── SSE /api/events ◀── Redis pub/sub ─┘  │
                                                  BullMQ queues ─▶ workers: sourcing · outreach · reply
                                                                  │
                                                    Claude or OpenAI · Serper · SMTP (or log)
```

```
src/
  config/        env (zod-validated), Mongo, Redis
  models/        Job, Candidate, Campaign, SendLog, Message (chat + card), Activity
  views/         cards.ts — chat card payloads, the presentation layer of this API
  controllers/   chat, jobs, candidates, campaigns, events (SSE)
  routes/        one router, every endpoint listed in one place
  services/      business logic. Pure + unit-tested: pipeline, dedupe, csv, stats, outreach, safety.
                 With I/O: ai, llm, search, mailer, campaigns, replies, candidates, actions, messages, events
  services/llm/  provider layer: types.ts (neutral shapes), anthropic.ts, openai.ts, index.ts (selection, usage/cost)
  agent/         tools.ts (tool definitions + handlers), agent.ts (tool-use loop)
  queues/        queues.ts + workers/ (sourcing, outreach, reply)
test/            vitest unit tests; test/e2e/ full-flow test against real Mongo + Redis
```

Every candidate status change goes through one function, `changeStatus` (`services/candidates.service.ts`), which validates the transition against the pipeline (`services/pipeline.ts`) and writes the activity log. Chat, UI buttons and workers all use it.

## How the agent works

`agent/agent.ts` is a provider-neutral tool-use loop. It talks only to `services/llm` (`chat` with tools, `json` for structured output), and the Anthropic and OpenAI adapters translate to each API. Each user turn:

1. The persisted chat is rebuilt into model history (cards become short text notes), so history survives refreshes and restarts.
2. Claude calls tools until it answers (max 10 steps). Tool inputs are validated with zod; errors go back to the model as `is_error` results.
3. The reply text is saved, followed by any cards the tools produced.

**Confirmation before any write or send is enforced in code, not by the prompt.** Tools are either read-only (`list_jobs`, `list_candidates`, `find_candidate`, `list_campaigns`, `get_stats`, `read_jd_link`) or `propose_*`/`show_*` tools that only create a *pending card*. The write happens in `services/actions.service.ts` when the recruiter clicks Confirm (`POST /api/messages/:id/action`). The card's status flips from `pending` atomically, so a double click can't apply a write twice.

| Brief's tool | Agent tool → card | Write on confirm |
|---|---|---|
| create job | `propose_job` → editable job card | `Job.create`, then asks to start sourcing |
| source / score | `propose_sourcing`, `propose_scoring` | enqueue sourcing job |
| accept/reject | `show_candidates` (buttons), `propose_decisions` ("accept the top 5") | `changeStatus` for each |
| create campaign | `propose_campaign` → draft campaign with AI emails, editable preview | — (draft only) |
| send | approve the campaign card | campaign `active`, step 0 enqueued |
| reply | `show_pending_reply` → editable reply card | `sendReply` |
| update status | `find_candidate` + `propose_status_change` ("mark Rahim as hired") | `changeStatus` |
| get stats | `get_stats` → stats card + AI summary in the reply | — |

## Background jobs (BullMQ, 3 attempts with exponential backoff)

- **sourcing** — web search for public profiles (`site:linkedin.com/in …`): Serper when `SERPER_API_KEY` is set, otherwise Claude's hosted web search tool limited to linkedin.com (needs `LLM_PROVIDER=anthropic`). Only result titles, URLs and snippets are read; LinkedIn is never scraped plus CSV rows → dedupe by email / normalised profile URL → insert → score in batches of 10 (0–100 + reason). It updates a progress card live ("Found 23, added 20, scored 15 of 20") and posts the candidate table when done. Retries are safe: dedupe skips rows already inserted and scoring resumes on unscored candidates.
- **outreach** — one job per (campaign, candidate, step). Sending step *n* schedules step *n+1* after the day gap. Before each send it checks: campaign active (if paused, the job is re-delayed), candidate still eligible (step 0 needs `accepted`, follow-ups need `contacted`; any reply or unsubscribe stops follow-ups), and the daily limit (if reached, the job waits until tomorrow). **No step is sent twice:** a deterministic BullMQ job id plus a unique `(campaign, candidate, step)` index on `SendLog`, written before sending and removed if the send fails.
- **reply** — triggered by `POST /api/simulate-reply` (or the "Simulate reply" button). Logs the inbound email, moves the candidate to Replied, classifies it (Interested / Not interested / Question / Wants a meeting / Unsubscribe), updates status, and drafts a response. *Wants a meeting* gets a booking link to a mock time-slot picker (`/book/:candidateId`) and is marked Meeting booked. Drafts wait for approval unless the job's **auto-reply** is on.

Live progress: workers publish events to Redis; `GET /api/events` streams them to the browser over SSE.

## LLM provider: Claude or OpenAI, chosen in env

```
LLM_PROVIDER=anthropic   ANTHROPIC_API_KEY=…   ANTHROPIC_MODEL=claude-opus-5-5
LLM_PROVIDER=openai      OPENAI_API_KEY=…      OPENAI_MODEL=gpt-5
```

Only the selected provider's key is needed. Both providers run the same agent, tools, prompts and confirmation gate:

- **Anthropic** (default): Messages API tool use. Structured outputs via `messages.parse` + zod at `effort: low`; the agent runs at `effort: medium`. Each assistant turn's raw content (including thinking blocks) is replayed unchanged within a turn, as the API requires.
- **OpenAI**: Chat Completions function calling. Structured outputs via `response_format: json_schema` (generated from the same zod schema) and validated with zod.
- **Cost tracking** uses built-in prices for the default Claude models. For any other model, set `LLM_INPUT_PRICE` / `LLM_OUTPUT_PRICE` (USD per 1M tokens), otherwise only token counts are tracked.

**Default choice: Claude (`claude-opus-5-5`)**, because it is reliable at tool use and structured extraction and handles untrusted text well. The adapter layer means switching providers is a config change, not a code change.
- **No agent framework.** The control flow we need is small: a loop, a list of tools, and a confirmation gate. A thin adapter per provider is about 60 lines; LangGraph or similar would add a dependency and indirection without removing any code. The real safety property (no write without confirmation) sits in our action layer, where it is easy to test and does not depend on model behaviour.

## Safety

- **Prompt injection:** all candidate and web text is wrapped in `<untrusted …>` tags that the system prompts declare inert. A detector (`services/safety.ts`) flags suspicious replies. Flagged content is shown with a warning and is never auto-sent, and the agent can't write without a human click anyway.
- **Auto-reply rules:** auto-send only for *interested* / *wants meeting*, never for questions, unsubscribes or flagged messages.
- **Never invent data:** web search returns only what Serper gives; with no key it returns nothing and says so. Prompts tell the model to say when it doesn't know.
- All request bodies are validated with zod at the HTTP boundary.

## Done / mocked / skipped

**Done:** every core requirement — chat with interactive cards (job confirmation, sourcing, candidate table, decisions, email preview/editing, reply drafts, status changes, stats), tool-using agent with enforced confirmation, BullMQ jobs with retries, SSE live progress, CSV upload, dedupe, scoring, single and multi-step campaigns with daily limit and no repeat sends, simulated replies with classification and drafts, follow-up stop, booking, status changes from chat and UI with activity log, dashboard (funnel, reply rate, interested rate, meetings, hires per job), persisted chat and data.
**Optional, done:** real email via SMTP (Mailtrap/Ethereal), auto-reply mode with safety rules, token and cost tracking per job, pause/resume campaigns, AI summary per job, prompt-injection protection.

**Mocked:** inbox → `POST /api/simulate-reply`; Calendly → mock slot picker (next 5 weekdays, 10:00 and 15:00); email → logged unless `SMTP_URL` is set; web search → Serper, or Claude web search, or off (CSV only) when neither is available.

**Skipped:** authentication and multi-tenancy (single recruiter); a real inbox (IMAP/webhook); timezone handling for booking slots; browser (Playwright) tests.

**Tests:** unit tests cover the pure logic, the provider adapters and the agent's confirmation gate. `test/e2e/flow.e2e.test.ts` runs the whole JD → hire flow against real Mongo, Redis, BullMQ and SSE with a deterministic fake LLM.

## Trade-offs

- **Single chat thread, rebuilt as text each turn.** Simple and survives restarts, but tool-call details from earlier turns are summarised rather than replayed exactly.
- **Workers run in the API process by default** for one-command setup. They are stateless and talk over Redis, so `npm run worker` scales them out.
- **Campaign drafts are generated when the campaign is proposed** (one LLM call per candidate), so the recruiter sees every email before approving. Large campaigns make that chat turn slower; a queue-based drafting step would fix it.
- **Strict status pipeline.** It prevents mistakes like Sourced → Hired, but recruiters can't skip steps. Allowed moves come from one table (`pipeline.ts`) and are shown in the UI.
- **Agent token usage is attributed to a job** only once that turn touches a job.
- **Server-side refusal fallbacks are not enabled.** A refusal returns a polite message.

## API

`GET /api/messages` · `POST /api/chat` · `POST /api/messages/:id/action` · `GET /api/events` (SSE)
`GET /api/jobs` · `GET|PATCH /api/jobs/:id` · `GET /api/jobs/:id/{candidates,activity,campaigns,summary}` · `POST /api/jobs/:id/candidates/csv`
`PATCH /api/candidates/:id/status` · `POST /api/candidates/:id/reply` · `GET /api/candidates/:id/booking` · `POST /api/candidates/:id/book` · `POST /api/simulate-reply`
`GET /api/campaigns/:id` · `PUT /api/campaigns/:id/drafts` · `POST /api/campaigns/:id/{pause,resume}`
