import type { ReactNode } from 'react';

export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-5 text-center">
    <p className="font-medium">{title}</p>
    {children && <div className="text-xs text-muted-foreground">{children}</div>}
  </div>
);
