import { describe, it, expect } from 'vitest';
import { label, statusTone } from './format';

describe('format', () => {
  it('labels statuses for humans', () => expect(label('meeting_booked')).toBe('meeting booked'));
  it('uses state tones, not brand colours, for statuses', () => {
    expect(statusTone('hired')).toBe('success');
    expect(statusTone('unsubscribed')).toBe('destructive');
  });
});
