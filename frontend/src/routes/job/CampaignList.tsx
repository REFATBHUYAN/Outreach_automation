import { Badge, Button, DataTable } from '../../components/ui';
import { post } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { forJob, useApi } from '../../lib/useApi';
import type { Campaign } from '../../lib/types';

export function CampaignList({ jobId }: { jobId: string }) {
  const { data = [], reload } = useApi<Campaign[]>(`/jobs/${jobId}/campaigns`, forJob(jobId));
  const toggle = (c: Campaign) => post(`/campaigns/${c._id}/${c.status === 'active' ? 'pause' : 'resume'}`).then(reload);
  return (
    <DataTable
      rows={data}
      rowKey={(c) => c._id}
      empty="No campaigns yet — ask the AI to create one"
      columns={[
        { header: 'Created', cell: (c) => formatDate(c.createdAt) },
        { header: 'Status', cell: (c) => <Badge tone={c.status === 'active' ? 'success' : c.status === 'paused' ? 'warning' : 'neutral'}>{c.status}</Badge> },
        { header: 'Recipients', className: 'font-mono', cell: (c) => new Set(c.drafts.map((d) => d.candidateId)).size },
        { header: 'Days', className: 'font-mono', cell: (c) => c.steps.map((s) => s.day).join(' · ') },
        { header: '', cell: (c) => (c.status === 'active' || c.status === 'paused') && <Button size="sm" variant="secondary" onClick={() => toggle(c)}>{c.status === 'active' ? 'Pause' : 'Resume'}</Button> },
      ]}
    />
  );
}
