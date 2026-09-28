import { STATUS_TONES, STOCK_LABELS } from '../utils/constants';
import { humanize } from '../utils/format';
import './StatusBadge.css';

export default function StatusBadge({ status, tone, children, size = 'md' }) {
  const resolvedTone = tone || STATUS_TONES[status] || 'neutral';
  const label = children || STOCK_LABELS[status] || humanize(status);
  return <span className={`badge badge--${resolvedTone} badge--${size}`}>{label}</span>;
}
