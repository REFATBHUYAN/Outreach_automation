import { z } from 'zod';
import { normUrl } from '../dedupe';

export interface FoundProfile { name: string; url: string; headline?: string; company?: string; location?: string; education?: string; summary?: string }

const schema = z.object({
  profiles: z.array(z.object({
    name: z.string().min(1), url: z.string(),
    headline: z.string().optional(), company: z.string().optional(), location: z.string().optional(),
    education: z.string().optional(), summary: z.string().optional(),
  })),
});

export const PROFILE_PROMPT = (query: string) => `Search the web with this query and collect public LinkedIn profiles (linkedin.com/in/...):
${query}

Return ONLY JSON, no prose: {"profiles":[{"name":"","url":"","headline":"","company":"","location":"","education":"","summary":""}]}
Rules: include only people whose profile URL appeared in your search results. Use only facts shown in the results; leave a field empty if unknown. Never guess.`;

/**
 * Parses the model's JSON and keeps only LinkedIn profile URLs that really appeared in the search sources.
 * This is the guard that stops invented candidates.
 */
export function parseProfiles(text: string, sourceUrls: string[]): FoundProfile[] {
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(JSON.parse(json));
  } catch {
    return [];
  }
  const allowed = new Set(sourceUrls.map(normUrl));
  const clean = (s?: string) => s?.trim() || undefined;
  return parsed.profiles
    .filter((p) => /linkedin\.com\/in\//i.test(p.url) && allowed.has(normUrl(p.url)))
    .map((p) => ({ name: p.name.trim(), url: p.url, headline: clean(p.headline), company: clean(p.company), location: clean(p.location), education: clean(p.education), summary: clean(p.summary) }));
}
