import { describe, it, expect } from 'vitest';
import { toRow } from '../src/services/search.service';

describe('toRow', () => {
  it('extracts name, headline, company, location and education from a Google result without inventing data', () => {
    expect(toRow({
      title: 'Jane Doe - Senior React Engineer - Acme | LinkedIn',
      link: 'https://linkedin.com/in/jane',
      snippet: 'Experience: Acme · Education: BUET · Location: Dhaka · 500+ connections',
    })).toEqual({
      name: 'Jane Doe', profileUrl: 'https://linkedin.com/in/jane', headline: 'Senior React Engineer', company: 'Acme',
      location: 'Dhaka', education: 'BUET', summary: 'Experience: Acme · Education: BUET · Location: Dhaka · 500+ connections',
    });
  });
  it('leaves unknown fields empty', () => {
    expect(toRow({ title: 'John Roe | LinkedIn', link: 'https://linkedin.com/in/john' })).toMatchObject({ name: 'John Roe', headline: undefined, company: undefined, location: undefined });
  });
});
