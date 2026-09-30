import { PackagePlus, Lock } from 'lucide-react';
import './PushToInventoryButton.css';

/**
 * The single action that moves a batch's birds into main inventory.
 * Always visible on open batches; switches on only when the batch is ready.
 */
export default function PushToInventoryButton({ batch, onClick, size = 'md' }) {
  if (!['ACTIVE', 'READY'].includes(batch.status)) return null;
  const ready = batch.status === 'READY';
  const waiting = `Available in ${batch.daysToReady} day${batch.daysToReady === 1 ? '' : 's'}`;

  return (
    <button
      type="button"
      className={`push-btn push-btn--${size} ${ready ? 'is-ready' : ''}`}
      onClick={ready ? onClick : undefined}
      disabled={!ready}
      title={ready ? `Move ${batch.live} birds into main inventory` : `${waiting} — the batch becomes ready at ${batch.targetAgeDays} days`}
      aria-label={ready ? `Push ${batch.batchCode} to main inventory` : `Push to main inventory — ${waiting.toLowerCase()}`}
    >
      {ready ? <PackagePlus aria-hidden="true" /> : <Lock aria-hidden="true" />}
      <span className="push-btn__text">
        <strong>Push to main inventory</strong>
        <small>{ready ? `${batch.live} birds ready` : waiting}</small>
      </span>
    </button>
  );
}
