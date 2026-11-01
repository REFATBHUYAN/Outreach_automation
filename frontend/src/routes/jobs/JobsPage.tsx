import { Link } from 'react-router-dom';
import { Badge, DataTable, EmptyState, PageHeader, PlusIcon } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { jobsChanged, useApi } from '../../lib/useApi';
import type { Job } from '../../lib/types';

export function Component() {
  const { data: jobs } = useApi<Job[]>('/jobs', jobsChanged);
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-5">
      <PageHeader
        title="Jobs"
        description="Create a job, let the AI search for matching profiles, then review and reach out."
        actions={<Link to="/jobs/new" className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 font-medium text-primary-foreground hover:opacity-90"><PlusIcon /> New job</Link>}
      />
      {jobs?.length === 0 ? (
        <EmptyState title="No jobs yet"><Link className="text-primary hover:underline" to="/jobs/new">Create your first job</Link></EmptyState>
      ) : (
        <DataTable
          rows={jobs ?? []}
          rowKey={(j) => j._id}
          columns={[
            { header: 'Job', cell: (j) => <Link to={`/jobs/${j._id}`} className="font-medium text-primary hover:underline">{j.title}</Link> },
            { header: 'Details', cell: (j) => <div className="flex flex-wrap gap-1.5">{[j.seniority, j.location, j.remotePolicy].filter(Boolean).map((m) => <Badge key={m}>{m}</Badge>)}</div> },
            { header: 'Candidates', className: 'font-mono', cell: (j) => j.stats.total },
            { header: 'Contacted', className: 'font-mono', cell: (j) => j.stats.contacted },
            { header: 'Hires', className: 'font-mono', cell: (j) => j.stats.hires },
            { header: 'Created', className: 'text-xs text-muted-foreground', cell: (j) => formatDate(j.createdAt) },
          ]}
        />
      )}
    </div>
  );
}
