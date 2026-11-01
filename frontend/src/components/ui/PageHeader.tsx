import type { ReactNode } from 'react';
import { PageTitle } from './typography';

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="grid grid-content-action items-end gap-4">
      <div className="flex flex-col gap-1">
        <PageTitle>{title}</PageTitle>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}
