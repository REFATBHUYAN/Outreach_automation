import type { Tone } from '../components/ui';
import type { Status } from './types';

export const label = (s: string) => s.replace(/_/g, ' ');

const TONE: Record<Status, Tone> = {
  sourced: 'neutral', accepted: 'info', contacted: 'info', replied: 'warning', interested: 'success', not_interested: 'destructive',
  meeting_booked: 'success', interviewed: 'warning', shortlisted: 'success', hired: 'success', rejected: 'destructive', unsubscribed: 'destructive',
};
export const statusTone = (s: Status) => TONE[s];

export const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '');
