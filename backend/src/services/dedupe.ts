export interface Identity { email?: string | null; profileUrl?: string | null }

export const normEmail = (e?: string | null) => e?.trim().toLowerCase() || undefined;
export const normUrl = (u?: string | null) =>
  u?.trim().toLowerCase().replace(/^https?:\/\/(www\.|[a-z]{2}\.)?/, '').split(/[?#]/)[0].replace(/\/+$/, '') || undefined;

/** Drops incoming rows whose email or profile URL matches an existing row or an earlier incoming row. */
export function dedupe<T extends Identity>(incoming: T[], existing: Identity[]): T[] {
  const seen = new Set<string>();
  const add = (c: Identity) => {
    const e = normEmail(c.email), u = normUrl(c.profileUrl);
    if (e) seen.add(`e:${e}`);
    if (u) seen.add(`u:${u}`);
  };
  existing.forEach(add);
  return incoming.filter((c) => {
    const e = normEmail(c.email), u = normUrl(c.profileUrl);
    if ((e && seen.has(`e:${e}`)) || (u && seen.has(`u:${u}`))) return false;
    add(c);
    return true;
  });
}
