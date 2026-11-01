import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Field, Input, PageHeader, SparkIcon, Textarea } from '../../components/ui';
import { post } from '../../lib/api';
import type { Job } from '../../lib/types';

/** Manual job creation: title + description. The AI extracts skills, seniority and location in the background of this request. */
export function Component() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    post<Job>('/jobs', { title, description })
      .then((job) => navigate(`/jobs/${job._id}`), (err: Error) => setError(err.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-5">
      <PageHeader title="New job" description="Paste the job description. The AI extracts the requirements, then writes search queries to find matching LinkedIn profiles." />
      <Card className="p-5">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label="Job title"><Input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior React Engineer" /></Field>
          <Field label="Job description">
            <Textarea required rows={14} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Responsibilities, must-have and nice-to-have skills, seniority, location, salary, remote policy…" />
          </Field>
          {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
            <Button type="submit" disabled={busy || !title.trim() || !description.trim()}><SparkIcon /> {busy ? 'Reading the description…' : 'Create job'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
