import { useState } from 'react';
import { Button, SparkIcon } from '../ui';
import { api } from '../../lib/api';

export function AiSummary({ jobId }: { jobId: string }) {
  const [state, setState] = useState<{ loading?: boolean; text?: string; error?: string }>({});
  const run = () => {
    setState({ loading: true });
    api<{ summary: string }>(`/jobs/${jobId}/summary`).then((r) => setState({ text: r.summary }), (e: Error) => setState({ error: e.message }));
  };
  return (
    <div className="flex flex-col items-start gap-2">
      {state.text ? (
        <div className="grid grid-icon-content gap-2.5 rounded-lg bg-accent p-4">
          <span className="pt-0.5 text-primary"><SparkIcon /></span>
          <p>{state.text}</p>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={run} disabled={state.loading}><SparkIcon /> {state.loading ? 'Summarising…' : 'AI summary'}</Button>
      )}
      {state.error && <p className="text-xs text-destructive" role="alert">{state.error}</p>}
    </div>
  );
}
