import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bird, Warehouse, CalendarDays, Snowflake, Undo2, Scale, Percent, XCircle, Ban, Wallet, Skull } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { MEAT_STORAGE } from '../../utils/constants';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { UseByBadge, daysUntil } from './AdminProcessingPage';
import './AdminMarketTripDetailsPage.css'; // shared fact strip and table styles
import './AdminProcessingPage.css';

const n = (v) => Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });

export default function AdminProcessingDetailsPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: run, loading, error, reload, setData } = useFetch(() => adminService.getProcessingRun(id), [id]);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader label="Loading run…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const cancelled = run.status === 'CANCELLED';
  const storage = MEAT_STORAGE[run.storage];
  const days = daysUntil(run.useBy);
  const fromBatch = run.sourceType === 'BATCH';

  const cancel = async () => {
    if (!reason.trim()) return toast.error('Give a reason for cancelling this run');
    setBusy(true);
    try {
      const result = await adminService.cancelProcessingRun(run._id, reason);
      toast.success(result.message);
      result.warnings?.forEach((w) => toast.error(w, { duration: 10000 }));
      setCancelling(false);
      setData(result.run);
    } catch (err) {
      toast.error(err.message, { duration: 10000 });
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/processing', label: 'Meat Processing' }}
        eyebrow={`${formatDate(run.processedOn)} · ${run.sourceName}`}
        title={run.runNumber}
        actions={
          <div className="row row--wrap">
            <StatusBadge tone={cancelled ? 'neutral' : 'success'}>{cancelled ? 'Cancelled' : 'Completed'}</StatusBadge>
            {!cancelled && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCancelling(true)}>
                <Undo2 /> Cancel run
              </button>
            )}
          </div>
        }
      />

      {cancelled && (
        <div className="form-alert form-alert--warning proc-cancelled">
          <XCircle aria-hidden="true" /> Cancelled {formatDateTime(run.cancelledAt)}
          {run.cancelledByName ? ` by ${run.cancelledByName}` : ''} — “{run.cancelReason}”. The meat was removed from stock and the birds returned to {run.sourceName}.
        </div>
      )}

      <div className="trip-facts">
        <div>
          {fromBatch ? <Bird aria-hidden="true" /> : <Warehouse aria-hidden="true" />}
          <span>
            <small>Birds from</small>
            <strong>
              {fromBatch && run.batch ? (
                <Link to={`/admin/batches/${run.batch}`} className="link">
                  {run.sourceName}
                </Link>
              ) : run.sourceProduct ? (
                <Link to={`/admin/products/${run.sourceProduct}/edit`} className="link">
                  {run.sourceName}
                </Link>
              ) : (
                run.sourceName
              )}
            </strong>
          </span>
        </div>
        <div>
          <Snowflake aria-hidden="true" />
          <span>
            <small>Storage</small>
            <strong>{storage?.label || run.storage}</strong>
          </span>
        </div>
        <div>
          <CalendarDays aria-hidden="true" />
          <span>
            <small>Use by</small>
            <strong className="proc-useby-inline">
              <UseByBadge date={run.useBy} cancelled={cancelled} />
              {!cancelled && days >= 0 && <em>{days === 0 ? 'last day' : `${days} day${days === 1 ? '' : 's'} left`}</em>}
            </strong>
          </span>
        </div>
        <div className="trip-facts__out">
          <span>
            <small>Meat produced</small>
            <strong>{run.unitsOut} units</strong>
          </span>
        </div>
      </div>
      {run.notes && <p className="trip-notes">“{run.notes}”</p>}

      <div className="proc-figures">
        <Figure icon={Bird} label="Birds processed" value={n(run.birdsIn)} />
        <Figure icon={Skull} label="Condemned" value={n(run.condemned)} hint={run.condemned ? `${run.condemnedPct}% of birds` : 'None rejected'} tone={run.condemned ? 'warn' : undefined} />
        <Figure icon={Scale} label="Live weight" value={run.liveWeightKg ? `${n(run.liveWeightKg)} kg` : '—'} />
        <Figure icon={Scale} label="Dressed weight" value={run.dressedKg ? `${n(run.dressedKg)} kg` : '—'} hint={run.avgDressedKg ? `${run.avgDressedKg} kg per bird` : undefined} />
        <Figure icon={Percent} label="Dressing yield" value={run.yieldPct !== null && run.yieldPct !== undefined ? `${run.yieldPct}%` : '—'} hint={run.yieldPct ? 'Broilers typically 70–75%' : 'Add both weights to see it'} />
        <Figure
          icon={Wallet}
          label="Processing cost"
          value={run.processingCost ? formatCurrency(run.processingCost) : '—'}
          hint={run.processingCost && run.unitsOut ? `${formatCurrency(run.processingCost / run.unitsOut)} per unit` : undefined}
        />
      </div>

      <section className="admin-card">
        <div className="admin-card__head">
          <h2>Prepared meat {cancelled ? 'that was produced' : 'added to stock'}</h2>
        </div>
        <div className="trip-table-wrap">
          <table className="trip-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Option</th>
                <th className="num">Quantity</th>
                <th className="num">Weight</th>
              </tr>
            </thead>
            <tbody>
              {run.outputs.map((o) => (
                <tr key={o._id}>
                  <td data-label="Product">
                    <Link to={`/admin/products/${o.product}/edit`} className="link">
                      <strong>{o.productName}</strong>
                    </Link>
                  </td>
                  <td data-label="Option">{o.variantLabel || '—'}</td>
                  <td data-label="Quantity" className="num">
                    <strong>{o.quantity}</strong>
                  </td>
                  <td data-label="Weight" className="num">
                    {o.weightKg ? `${n(o.weightKg)} kg` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-card__body proc-recorded">
          Recorded by {run.byName || 'Admin'} · {formatDateTime(run.createdAt)}
          {!cancelled && (
            <>
              {' · '}
              Spoiled or damaged meat? Record it in{' '}
              <Link to="/admin/losses" className="link">
                Mortality & Losses
              </Link>
              .
            </>
          )}
        </div>
      </section>

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancel this processing run?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCancelling(false)} disabled={busy}>
              Back
            </button>
            <button type="button" className="btn btn--danger" onClick={cancel} disabled={busy}>
              {busy && <span className="spinner" />} <Ban /> Cancel run
            </button>
          </>
        }
      >
        <div className="stack">
          <p className="text-muted">
            Use this for a run entered by mistake. The {run.unitsOut} unit(s) of meat leave stock and the {run.birdsIn} bird(s) go back to {run.sourceName}. It is
            refused if some of the meat has already been sold or reserved.
          </p>
          <FormField label="Reason" required>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} autoFocus />
          </FormField>
        </div>
      </Modal>
    </>
  );
}

function Figure({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className={`proc-figure ${tone ? `proc-figure--${tone}` : ''}`}>
      <Icon aria-hidden="true" />
      <small>{label}</small>
      <strong>{value}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}
