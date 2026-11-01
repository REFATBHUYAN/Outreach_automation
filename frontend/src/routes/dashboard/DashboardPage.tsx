import { Link } from 'react-router-dom';
import { ArrowIcon, Badge, Card, EmptyState, PageHeader, SectionTitle } from '../../components/ui';
import { StatsPanel } from '../../components/stats/StatsPanel';
import { AiSummary } from '../../components/stats/AiSummary';
import { jobsChanged, useApi } from '../../lib/useApi';
import type { Job } from '../../lib/types';

export function Component() {
  const { data: jobs } = useApi<Job[]>('/jobs', jobsChanged);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-5">
      <PageHeader title="Dashboard" description="Pipeline, reply rate, interested rate, meetings and hires for every job." />
      {jobs?.length === 0 && <EmptyState title="No jobs yet"><Link className="text-primary hover:underline" to="/">Paste a job description in chat</Link> to get started.</EmptyState>}
      {jobs?.map((job) => (
        <Card key={job._id} className="flex flex-col gap-5 p-5">
          <div className="grid grid-content-action items-start gap-4">
            <div className="flex flex-col gap-1.5">
              <SectionTitle>{job.title}</SectionTitle>
              <div className="flex flex-wrap gap-1.5">{[job.seniority, job.location, job.remotePolicy].filter(Boolean).map((m) => <Badge key={m}>{m}</Badge>)}</div>
            </div>
            <Link to={`/jobs/${job._id}`} className="flex items-center gap-1.5 font-medium text-primary hover:underline">Open job <ArrowIcon /></Link>
          </div>
          <StatsPanel job={job} />
          <div className="grid grid-content-action items-end gap-4">
            <AiSummary jobId={job._id} />
            <span className="font-mono text-2xs text-muted-foreground">{job.usage?.inputTokens ?? 0} in · {job.usage?.outputTokens ?? 0} out tokens</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
