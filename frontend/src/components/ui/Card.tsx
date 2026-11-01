import type { HTMLAttributes } from 'react';

export const Card = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`rounded-xl border border-border bg-card p-4 ${className}`} {...props} />
);
