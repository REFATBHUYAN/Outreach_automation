import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, EmptyState, PageTitle } from '../../components/ui';
import { post } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useApi } from '../../lib/useApi';

/** Public mock time-slot picker that stands in for Calendly. */
export function Component() {
  const { candidateId } = useParams();
  const { data, error } = useApi<{ name: string; jobTitle?: string; meetingAt?: string; slots: string[] }>(`/candidates/${candidateId}/booking`);
  const [booked, setBooked] = useState<string>();
  const [err, setErr] = useState<string>();
  const book = (slot: string) => post<{ meetingAt: string }>(`/candidates/${candidateId}/book`, { slot }).then((r) => setBooked(r.meetingAt), (e: Error) => setErr(e.message));

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 p-5">
      {error && <EmptyState title="This booking link is not valid" />}
      {data && (
        <Card className="flex flex-col gap-4">
          <PageTitle>Hi {data.name}, pick a time</PageTitle>
          <p className="text-muted-foreground">30-minute intro call about {data.jobTitle ?? 'the role'}.</p>
          {booked || data.meetingAt ? (
            <p className="font-medium text-success">Booked for {formatDate(booked ?? data.meetingAt)}. See you then!</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {data.slots.map((s) => <Button key={s} variant="secondary" onClick={() => book(s)}>{formatDate(s)}</Button>)}
            </div>
          )}
          {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
        </Card>
      )}
    </main>
  );
}
