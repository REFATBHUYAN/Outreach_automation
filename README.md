# AI Recruiting Co-Worker

One repository, two apps:

- [`backend/`](backend) — Express + BullMQ + MongoDB + LLM agent (Claude or OpenAI). **Main README: architecture, agent design, mocks, trade-offs.**
- [`frontend/`](frontend) — React 18 chat UI, job page, dashboard.

Requirements: Node 20+ and Docker Desktop (running).

> **Secrets:** API keys live only in `backend/.env`, which is git-ignored. Copy `backend/.env.example` to start. A pre-commit hook (`.githooks/pre-commit`, enabled by `npm run dev` / `npm test`, or `git config core.hooksPath .githooks`) refuses commits containing `.env` files or key-shaped strings.

## Run locally — one command

```bash
npm install     # root tooling only
npm run dev     # first run creates backend/.env + frontend/.env and installs deps
```

This starts Mongo + Redis in Docker, the API + workers on http://localhost:4000 and the UI on http://localhost:5173.
Set `LLM_PROVIDER` and its API key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) in `backend/.env` to enable chat. For a quick demo of Day 0/3/7 follow-ups, set `OUTREACH_DAY_MS=60000`.

## Test

```bash
npm test             # backend unit + frontend unit + end-to-end flow (Mongo/Redis in Docker)
npm run test:e2e     # only the end-to-end flow
npm run docker:test  # the same suites, fully inside containers
```

The end-to-end test (`backend/test/e2e/flow.e2e.test.ts`) drives the whole flow through the real HTTP API, MongoDB, Redis, BullMQ workers and SSE:
JD → confirm job → sourcing (no invented candidates) → CSV import with dedupe and scoring → accept/reject → campaign with edited drafts → sends, follow-up stop on reply, no repeat sends → reply classification and approval → booking → interview/shortlist/hire → activity log → stats. Only the LLM is faked (deterministic), so it needs no API key and costs nothing.

## Run everything in Docker

```bash
npm run docker:up    # builds and starts mongo, redis, backend, frontend → http://localhost:5173
npm run docker:down
```
