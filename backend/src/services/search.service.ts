import { env } from '../config/env';
import type { CandidateRow } from './csv';
import { llm, trackUsage } from './llm';

const isProfile = (url: string) => /linkedin\.com\/in\//i.test(url);

/**
 * Public-profile search for one query. LinkedIn is never scraped: only search results are read.
 * Serper (Google) when SERPER_API_KEY is set; otherwise the LLM provider's hosted web search,
 * whose answers are kept only if their URLs appear in the real search sources.
 */
export async function searchProfiles(query: string, jobId?: string): Promise<{ rows: CandidateRow[]; note?: string }> {
  if (env.SERPER_API_KEY) return serper(query);
  let provider;
  try {
    provider = llm();
  } catch {
    return { rows: [], note: 'Web search skipped: set SERPER_API_KEY or an LLM API key. Upload a CSV instead.' };
  }
  const { profiles, usage } = await provider.findProfiles(query);
  await trackUsage(jobId, usage);
  return {
    rows: profiles.map((p) => ({ name: p.name, profileUrl: p.url, headline: p.headline, company: p.company, location: p.location, education: p.education, summary: p.summary })),
  };
}

async function serper(query: string) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': env.SERPER_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: 20 }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}`);
  const data = (await res.json()) as { organic?: { title: string; link: string; snippet?: string }[] };
  return { rows: (data.organic ?? []).filter((r) => isProfile(r.link)).map(toRow) };
}

const field = (snippet: string, label: string) => snippet.match(new RegExp(`${label}:\\s*([^·|\\n]+)`, 'i'))?.[1].trim();

// Google result titles look like "Jane Doe - Senior React Engineer - Acme | LinkedIn";
// LinkedIn snippets often carry "Experience: Acme · Education: BUET · Location: Dhaka".
export function toRow(r: { title: string; link: string; snippet?: string }): CandidateRow {
  const [name, headline, company] = r.title.replace(/\s*[|–-]\s*LinkedIn.*$/i, '').split(/\s+[-–|]\s+/).map((s) => s.trim());
  const snippet = r.snippet ?? '';
  return {
    name,
    profileUrl: r.link,
    headline: headline || undefined,
    company: company || field(snippet, 'Experience'),
    location: field(snippet, 'Location'),
    education: field(snippet, 'Education'),
    summary: snippet.slice(0, 500) || undefined,
  };
}

/** Reads a JD from a link. Plain text only; callers treat it as untrusted. */
export async function fetchPageText(url: string) {
  if (!/^https?:\/\//i.test(url)) throw new Error('Only http(s) URLs are allowed');
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const html = await res.text();
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 15_000);
}
