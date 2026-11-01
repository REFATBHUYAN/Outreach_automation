import { describe, it, expect } from 'vitest';
import { dedupe, normUrl } from '../src/services/dedupe';

describe('dedupe', () => {
  it('normalises profile URLs', () => {
    expect(normUrl('https://www.linkedin.com/in/jane-doe/?trk=x')).toBe('linkedin.com/in/jane-doe');
    expect(normUrl('http://uk.linkedin.com/in/jane-doe')).toBe('linkedin.com/in/jane-doe');
  });
  it('drops duplicates by email or profile URL against existing and within the batch', () => {
    const existing = [{ email: 'a@x.com' }, { profileUrl: 'https://linkedin.com/in/b' }];
    const incoming = [
      { name: 'A', email: 'A@X.com ' },
      { name: 'B', profileUrl: 'https://www.linkedin.com/in/b/' },
      { name: 'C', email: 'c@x.com' },
      { name: 'C2', email: 'c@x.com' },
      { name: 'D' },
    ];
    expect(dedupe(incoming, existing).map((c) => c.name)).toEqual(['C', 'D']);
  });
});
