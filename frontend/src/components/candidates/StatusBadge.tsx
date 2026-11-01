import { Badge } from '../ui';
import { label, statusTone } from '../../lib/format';
import type { Status } from '../../lib/types';

export const StatusBadge = ({ status }: { status: Status }) => <Badge tone={statusTone(status)}>{label(status)}</Badge>;
