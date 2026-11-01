import { StatusBadge } from '../../../components/candidates/StatusBadge';
import { ArrowIcon } from '../../../components/ui';
import { CardShell, type CardProps } from './CardShell';
import type { Status } from '../../../lib/types';

export function DecisionConfirmCard(props: CardProps) {
  const { decisions = [], errors } = props.message.card!.data as { decisions: { candidateId: string; name: string; decision: Status }[]; errors?: string[] };
  return (
    <CardShell {...props} eyebrow="Review decisions" title={`${decisions.length} candidates`} confirmLabel="Apply decisions">
      <ul className="flex flex-col divide-y divide-border">
        {decisions.map((d) => <li key={d.candidateId} className="flex items-center justify-between gap-2 py-2">{d.name} <StatusBadge status={d.decision} /></li>)}
      </ul>
      {errors?.map((e) => <p key={e} className="text-xs text-destructive">{e}</p>)}
    </CardShell>
  );
}

export function StatusConfirmCard(props: CardProps) {
  const d = props.message.card!.data;
  return (
    <CardShell {...props} eyebrow="Status change" title={d.name} confirmLabel="Update status">
      <p className="flex flex-wrap items-center gap-2">
        <StatusBadge status={d.from} /> <ArrowIcon /> <StatusBadge status={d.to} />
      </p>
      {d.note && <p className="text-xs text-muted-foreground">{d.note}</p>}
    </CardShell>
  );
}
