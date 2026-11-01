import { Link } from 'react-router-dom';
import { StatsPanel } from '../../../components/stats/StatsPanel';
import { ArrowIcon } from '../../../components/ui';
import { forJob, useApi } from '../../../lib/useApi';
import type { Job } from '../../../lib/types';
import { CardShell, type CardProps } from './CardShell';

export function StatsCard(props: CardProps) {
  const jobId = props.message.card!.data.jobId;
  const { data: job } = useApi<Job>(`/jobs/${jobId}`, forJob(jobId));
  if (!job) return null;
  return (
    <CardShell {...props} eyebrow="Progress" title={job.title}>
      <StatsPanel job={job} />
      <Link className="flex items-center gap-1.5 self-start font-medium text-primary hover:underline" to="/dashboard">Open dashboard <ArrowIcon /></Link>
    </CardShell>
  );
}
