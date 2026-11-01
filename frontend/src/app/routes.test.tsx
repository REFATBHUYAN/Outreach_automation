import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, act } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from './router';

// Smoke test: every route mounts, renders every card type and unmounts without React errors.
const job = { _id: 'j1', title: 'React Engineer', mustHave: [], niceToHave: [], autoReply: false, usage: { costUsd: 0, inputTokens: 0, outputTokens: 0 },
  stats: { total: 0, funnel: {}, contacted: 0, replied: 0, interested: 0, replyRate: 0, interestedRate: 0, meetings: 0, hires: 0 } };
const candidate = { _id: 'c1', jobId: 'j1', name: 'Ada', status: 'contacted', allowedNext: ['replied'], thread: [], pendingReply: null };
const data = { jobId: 'j1', campaignId: 'k1', decisions: [], notes: [], mustHave: [], niceToHave: [], category: 'interested', name: 'Ada', from: 'interviewed', to: 'hired', queries: ['site:linkedin.com/in "React"'] };
const messages = ['job_confirm', 'sourcing_confirm', 'scoring_confirm', 'sourcing_progress', 'candidate_table', 'decision_confirm', 'status_confirm', 'campaign_preview', 'reply_draft', 'stats']
  .map((type, i) => ({ _id: `m${i}`, role: 'assistant', text: 'hi', createdAt: '', card: { type, status: 'pending', data } }));

const respond = (url: string) =>
  url.endsWith('/messages') ? messages
  : url.endsWith('/sourcing') ? null
  : url.endsWith('/jobs') ? [job]
  : url.includes('/booking') ? { name: 'Ada', slots: [] }
  : url.endsWith('/candidates') ? [candidate]
  : url.includes('/campaigns/k1') ? { _id: 'k1', status: 'draft', steps: [{ day: 0 }], drafts: [] }
  : /\/(activity|campaigns)$/.test(url) ? []
  : job;

beforeAll(() => {
  vi.stubGlobal('EventSource', class { onmessage = null; close() {} });
  Element.prototype.scrollIntoView = () => {};
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (u) => new Response(JSON.stringify(respond(String(u)))));
});

describe('routes', () => {
  for (const path of ['/', '/dashboard', '/jobs', '/jobs/new', '/jobs/j1', '/book/c1']) {
    it(`${path} mounts and unmounts cleanly`, async () => {
      const errors: string[] = [];
      vi.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a.map(String).join(' ')));
      const router = createMemoryRouter(routes, { initialEntries: [path] });
      const { unmount } = render(<RouterProvider router={router} />);
      await act(() => new Promise((r) => setTimeout(r, 200)));
      await act(() => router.navigate(path === '/' ? '/dashboard' : '/'));
      unmount();
      expect(errors.filter((e) => !/Future Flag/.test(e))).toEqual([]);
    });
  }
});
