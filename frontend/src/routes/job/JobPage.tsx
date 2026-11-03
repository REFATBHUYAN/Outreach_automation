import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Card, EmptyState, PageHeader, SectionTitle, Switch } from '../../components/ui';
import { CandidateTable } from '../../components/candidates/CandidateTable';
import { StatsPanel } from '../../components/stats/StatsPanel';
import { AiSummary } from '../../components/stats/AiSummary';
import { api } from '../../lib/api';
import { forJob, useApi } from '../../lib/useApi';
import type { Candidate, Job } from '../../lib/types';
import { CandidatePanel } from './CandidatePanel';
import { ActivityLog } from './ActivityLog';
import { SourcingPanel } from './SourcingPanel';
import { OutreachPanel } from './OutreachPanel';

export function Component() {
  const { jobId = '' } = useParams();
  const { data: job, error, reload, setData } = useApi<Job>(`/jobs/${jobId}`, forJob(jobId));
  const { data: candidates = [], reload: reloadCandidates } = useApi<Candidate[]>(`/jobs/${jobId}/candidates`, forJob(jobId));
  const [selectedId, setSelectedId] = useState<string>();
  const selected = candidates.find((c) => c._id === selectedId);

  if (error) return <div className="p-5"><EmptyState title="Job not found">{error}</EmptyState></div>;
  if (!job) return null;
  const toggleAuto = () => api<Job>(`/jobs/${jobId}`, { method: 'PATCH', json: { autoReply: !job.autoReply } }).then((j) => setData({ ...job, autoReply: j.autoReply }));

  return (
    <div className="flex flex-col gap-5 p-5">
      <PageHeader
        title={job.title}
        description={
          <span className="flex flex-wrap gap-1.5 pt-1">
            {[job.seniority, job.location, job.remotePolicy, job.salary].filter(Boolean).map((m) => <Badge key={m}>{m}</Badge>)}
            {job.mustHave.map((s) => <Badge key={s} tone="info">{s}</Badge>)}
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5 text-xs" title="Auto-send safe replies (interested / wants a meeting). Questions and flagged messages always wait for you.">
            <Switch checked={job.autoReply} onChange={toggleAuto} label="Auto-reply" />
            <span>Auto-reply</span>
          </div>
        }
      />
      {job.description && (
        <details className="rounded-xl border border-border bg-card px-5 py-3">
          <summary className="cursor-pointer font-medium">Job description</summary>
          <p className="whitespace-pre-wrap pt-3 text-muted-foreground">{job.description}</p>
        </details>
      )}
      <SourcingPanel job={job} unscored={candidates.filter((c) => c.score == null).length} />
      <div className="grid gap-5 xl:grid-main-aside">
        <section className="flex min-w-0 flex-col gap-4">
          <SectionTitle>Candidates</SectionTitle>
          <CandidateTable jobId={jobId} selectedId={selectedId} onSelect={(c) => setSelectedId(c._id)} />
          <OutreachPanel jobId={jobId} candidates={candidates} />
        </section>
        <aside className="flex flex-col gap-4 xl:sticky xl:top-5 xl:self-start">
          {selected ? <CandidatePanel candidate={selected} onChange={() => { reloadCandidates(); reload(); }} /> : <EmptyState title="Select a candidate">Click Details to change status, simulate a reply or approve a draft.</EmptyState>}
          <SectionTitle>Activity</SectionTitle>
          <ActivityLog jobId={jobId} />
        </aside>
      </div>
      <Card className="flex flex-col gap-5 p-5">
        <SectionTitle>Progress</SectionTitle>
        <StatsPanel job={job} />
        <AiSummary jobId={jobId} />
      </Card>
    </div>
  );
}
