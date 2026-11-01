import { parse } from 'csv-parse/sync';

export interface CandidateRow {
  name: string; email?: string; profileUrl?: string; headline?: string; location?: string;
  company?: string; education?: string; summary?: string; query?: string;
}

const ALIASES: Record<'name' | 'email' | 'profileUrl' | 'headline' | 'location', string[]> = {
  name: ['name', 'full name', 'full_name', 'candidate'],
  email: ['email', 'e-mail', 'email address'],
  profileUrl: ['profileurl', 'profile url', 'profile_url', 'linkedin', 'url'],
  headline: ['headline', 'title', 'summary', 'role'],
  location: ['location', 'city'],
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parses an uploaded CSV. Rows without a name are dropped; invalid emails are discarded, not guessed. */
export function parseCandidatesCsv(text: string): CandidateRow[] {
  const records: Record<string, string>[] = parse(text, { columns: (h: string[]) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true });
  return records.flatMap((r) => {
    const pick = (k: keyof typeof ALIASES) => ALIASES[k].map((a) => r[a]).find(Boolean)?.slice(0, 500);
    const name = pick('name');
    if (!name) return [];
    const email = pick('email');
    return [{ name, email: email && EMAIL.test(email) ? email.toLowerCase() : undefined, profileUrl: pick('profileUrl'), headline: pick('headline'), location: pick('location') }];
  });
}
