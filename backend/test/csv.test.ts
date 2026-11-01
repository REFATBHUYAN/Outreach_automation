import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseCandidatesCsv } from '../src/services/csv';

describe('parseCandidatesCsv', () => {
  it('maps header aliases, drops nameless rows and invalid emails', () => {
    const rows = parseCandidatesCsv('Full Name,E-mail,LinkedIn,Title\nJane,jane@x.com,https://linkedin.com/in/jane,Dev\n,nobody@x.com,,\nBob,not-an-email,,QA\n');
    expect(rows).toEqual([
      { name: 'Jane', email: 'jane@x.com', profileUrl: 'https://linkedin.com/in/jane', headline: 'Dev', location: undefined },
      { name: 'Bob', email: undefined, profileUrl: undefined, headline: 'QA', location: undefined },
    ]);
  });
  it('parses the bundled sample CSV', () => {
    const rows = parseCandidatesCsv(readFileSync(`${__dirname}/../seed/sample-candidates.csv`, 'utf8'));
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((r) => r.name)).toBe(true);
  });
});
