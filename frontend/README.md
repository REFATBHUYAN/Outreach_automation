# AI Recruiting Co-Worker — Frontend

React 18 + TypeScript + Vite, Tailwind v4 with the design system tokens (`src/styles/globals.css`), React Router with route-based code splitting.

```bash
cp .env.example .env && npm install && npm run dev   # http://localhost:5173 (needs the backend on :4000)
npm test                                            # vitest + Testing Library
```

```
src/
  app/            router.tsx (lazy route chunks), AppLayout.tsx (nav rail)
  routes/         one folder per route = one chunk
    chat/         ChatPage + cards/ (one component per backend card type, registry in cards/index.tsx)
    job/          JobPage, CandidatePanel, CampaignList, ActivityLog
    dashboard/    DashboardPage
    book/         BookPage (public mock time-slot picker)
  components/ui/  design-system primitives: PageTitle, SectionTitle, Eyebrow, PageHeader, EmptyState, DataTable, Button, Card, Badge, form
  components/     shared feature components (CandidateTable, StatsPanel, AiSummary)
  lib/            api client, SSE hook, useApi (refetch on live events), types, formatting
```

Architecture, agent design, mocks and trade-offs: see the backend README.
