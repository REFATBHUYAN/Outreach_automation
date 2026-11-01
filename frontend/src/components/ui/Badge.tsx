import type { ReactNode } from 'react';

const TONES = {
  neutral: 'bg-muted text-muted-foreground',
  info: 'bg-accent text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
};
export type Tone = keyof typeof TONES;

export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) => (
  <span className={`inline-flex items-center rounded-full px-2 font-mono text-2xs font-medium ${TONES[tone]}`}>{children}</span>
);
