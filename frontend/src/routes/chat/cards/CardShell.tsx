import { useState, type ReactNode } from 'react';
import { Badge, Button, Eyebrow } from '../../../components/ui';
import { post } from '../../../lib/api';
import type { Message } from '../../../lib/types';

export interface CardProps { message: Message; onUpdate: (m: Message) => void }

const STATUS = { confirmed: { tone: 'success', label: 'Confirmed' }, cancelled: { tone: 'neutral', label: 'Cancelled' } } as const;

/** Frame for every chat card: title, status, and Confirm/Cancel while the card is pending. */
export function CardShell({ message, onUpdate, eyebrow, title, children, confirmLabel = 'Confirm', getEdits }: CardProps & {
  eyebrow: string; title?: ReactNode; children?: ReactNode; confirmLabel?: string; getEdits?: () => Record<string, unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const status = message.card!.status;
  const done = status === 'confirmed' || status === 'cancelled' ? STATUS[status] : undefined;
  const act = (action: 'confirm' | 'cancel') => {
    setBusy(true);
    setError(undefined);
    post<Message>(`/messages/${message._id}/action`, { action, data: action === 'confirm' ? getEdits?.() : undefined })
      .then(onUpdate, (e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };
  return (
    <section className={`flex flex-col rounded-xl border bg-card ${status === 'pending' ? 'border-ring' : 'border-border'}`}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Eyebrow>{eyebrow}</Eyebrow>
          {title && <p className="truncate font-medium">{title}</p>}
        </div>
        {done ? <Badge tone={done.tone}>{done.label}</Badge> : status === 'pending' && <Badge tone="info">Needs your review</Badge>}
      </header>
      {children && <div className="flex flex-col gap-4 p-4">{children}</div>}
      {error && <p className="px-4 pb-3 text-xs text-destructive" role="alert">{error}</p>}
      {status === 'pending' && (
        <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={() => act('cancel')} disabled={busy}>Cancel</Button>
          <Button onClick={() => act('confirm')} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
        </footer>
      )}
    </section>
  );
}
