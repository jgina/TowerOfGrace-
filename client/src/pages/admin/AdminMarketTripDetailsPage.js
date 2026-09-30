import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, User, Truck, CalendarDays, ClipboardCheck, Undo2 } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { LOSS_REASONS, TRIP_STATUS, lossReasonsFor } from '../../utils/constants';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import './AdminMarketTripDetailsPage.css';

const toInt = (v) => (v === '' || v === undefined ? 0 : parseInt(v, 10));

export default function AdminMarketTripDetailsPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: trip, loading, error, reload, setData } = useFetch(() => adminService.getMarketTrip(id), [id]);
  const [rows, setRows] = useState({});
  const [closingNotes, setClosingNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (trip?.status === 'OUT') {
      setRows(Object.fromEntries(trip.items.map((i) => [i._id, { sold: '', returned: '', lost: '', lossReason: '', salesAmount: '' }])));
    }
  }, [trip]);

  // Per-line balance check: sold + returned + lost must equal what left the farm.
  const lines = useMemo(
    () =>
      (trip?.items || []).map((item) => {
        const r = rows[item._id] || {};
        const sold = toInt(r.sold);
        const returned = toInt(r.returned);
        const lost = toInt(r.lost);
        const valid = [sold, returned, lost].every((n) => Number.isInteger(n) && n >= 0);
        const accounted = sold + returned + lost;
        return {
          item,
          r,
          sold,
          returned,
          lost,
          accounted,
          remaining: item.quantityOut - accounted,
          needsReason: lost > 0 && !r.lossReason,
          ok: valid && accounted === item.quantityOut && !(lost > 0 && !r.lossReason),
        };
      }),
    [trip, rows]
  );

  if (loading) return <PageLoader label="Loading trip…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const status = TRIP_STATUS[trip.status];
  const allBalanced = lines.every((l) => l.ok);
  const planned = lines.reduce(
    (t, l) => ({ sold: t.sold + l.sold, returned: t.returned + l.returned, lost: t.lost + l.lost, sales: t.sales + (Number(l.r.salesAmount) || 0) }),
    { sold: 0, returned: 0, lost: 0, sales: 0 }
  );

  const setRow = (itemId, changes) => setRows((all) => ({ ...all, [itemId]: { ...all[itemId], ...changes } }));
  const fillAll = (item, field) => setRow(item._id, { sold: '0', returned: '0', lost: '0', [field]: String(item.quantityOut) });

  const close = async () => {
    setBusy(true);
    try {
      const result = await adminService.closeMarketTrip(trip._id, {
        closingNotes,
        items: lines.map((l) => ({
          itemId: l.item._id,
          sold: l.sold,
          returned: l.returned,
          lost: l.lost,
          lossReason: l.lost ? l.r.lossReason : undefined,
          salesAmount: Number(l.r.salesAmount) || 0,
        })),
      });
      toast.success(result.message);
      result.warnings?.forEach((w) => toast.error(w, { duration: 10000 }));
      setConfirming(false);
      setData(result.trip);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const result = await adminService.cancelMarketTrip(trip._id, cancelReason);
      toast.success(result.message);
      setCancelling(false);
      setData(result.trip);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/market-trips', label: 'Market Trips' }}
        eyebrow={`${formatDate(trip.tripDate)} · ${trip.market}`}
        title={trip.tripNumber}
        actions={
          <div className="row row--wrap">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            {trip.status === 'OUT' && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCancelling(true)}>
                <Undo2 /> Cancel trip
              </button>
            )}
          </div>
        }
      />

      <div className="trip-facts">
        <div>
          <User aria-hidden="true" />
          <span>
            <small>Responsible</small>
            <strong>{trip.responsiblePerson || '—'}</strong>
          </span>
        </div>
        <div>
          <Truck aria-hidden="true" />
          <span>
            <small>Vehicle</small>
            <strong>{trip.vehicle || '—'}</strong>
          </span>
        </div>
        <div>
          <CalendarDays aria-hidden="true" />
          <span>
            <small>Sent by</small>
            <strong>
              {trip.dispatchedByName || 'Admin'} · {formatDateTime(trip.createdAt)}
            </strong>
          </span>
        </div>
        <div className="trip-facts__out">
          <span>
            <small>Taken to market</small>
            <strong>{trip.totals.out} units</strong>
          </span>
        </div>
      </div>
      {trip.notes && <p className="trip-notes">“{trip.notes}”</p>}

      {trip.status === 'OUT' && (
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Close the trip</h2>
            <span className="text-muted trip-help">For each line: sold + returned + lost must equal what went out.</span>
          </div>
          <div className="trip-table-wrap">
            <table className="trip-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Out</th>
                  <th className="num">Sold</th>
                  <th className="num">Returned</th>
                  <th className="num">Lost</th>
                  <th>Loss reason</th>
                  <th className="num">Sales (₦)</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.item._id} className={l.ok ? 'is-ok' : ''}>
                    <td data-label="Product">
                      <strong>{l.item.productName}</strong>
                      <small>{[l.item.categoryName, l.item.variantLabel].filter(Boolean).join(' · ')}</small>
                      <span className="trip-quick">
                        <button type="button" onClick={() => fillAll(l.item, 'sold')}>
                          All sold
                        </button>
                        <button type="button" onClick={() => fillAll(l.item, 'returned')}>
                          All returned
                        </button>
                      </span>
                    </td>
                    <td data-label="Out" className="num">
                      <strong>{l.item.quantityOut}</strong>
                    </td>
                    {['sold', 'returned', 'lost'].map((field) => (
                      <td key={field} data-label={field[0].toUpperCase() + field.slice(1)} className="num">
                        <input
                          className="input trip-input"
                          type="number"
                          min="0"
                          step="1"
                          value={l.r[field] ?? ''}
                          placeholder="0"
                          onChange={(e) => setRow(l.item._id, { [field]: e.target.value })}
                          aria-label={`${field} — ${l.item.productName}`}
                        />
                      </td>
                    ))}
                    <td data-label="Loss reason">
                      <select
                        className="select trip-input"
                        value={l.r.lossReason || ''}
                        onChange={(e) => setRow(l.item._id, { lossReason: e.target.value })}
                        disabled={!l.lost}
                        aria-invalid={l.needsReason ? 'true' : undefined}
                        aria-label="Loss reason"
                      >
                        <option value="">{l.lost ? 'Choose reason' : '—'}</option>
                        {lossReasonsFor(l.item.categorySlug).map(([code, r]) => (
                          <option key={code} value={code}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Sales (₦)" className="num">
                      <input
                        className="input trip-input trip-input--money"
                        type="number"
                        min="0"
                        step="50"
                        value={l.r.salesAmount ?? ''}
                        placeholder="0"
                        onChange={(e) => setRow(l.item._id, { salesAmount: e.target.value })}
                        aria-label={`Sales amount — ${l.item.productName}`}
                      />
                    </td>
                    <td data-label="Balance">
                      {l.ok ? (
                        <span className="trip-balance trip-balance--ok">
                          <CheckCircle2 /> Balanced
                        </span>
                      ) : l.remaining > 0 ? (
                        <span className="trip-balance trip-balance--short">
                          <AlertTriangle /> {l.remaining} to account for
                        </span>
                      ) : l.remaining < 0 ? (
                        <span className="trip-balance trip-balance--over">
                          <XCircle /> {-l.remaining} too many
                        </span>
                      ) : (
                        <span className="trip-balance trip-balance--short">
                          <AlertTriangle /> Choose loss reason
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Totals</td>
                  <td className="num">{trip.totals.out}</td>
                  <td className="num is-sold">{planned.sold}</td>
                  <td className="num is-back">{planned.returned}</td>
                  <td className="num is-lost">{planned.lost}</td>
                  <td />
                  <td className="num">{formatCurrency(planned.sales)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="admin-card__body trip-close">
            <FormField label="Closing notes (optional)" className="trip-close__notes">
              <input className="input" value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} placeholder="e.g. Market was slow; prices lower than usual" maxLength={1000} />
            </FormField>
            <button type="button" className="btn btn--primary btn--lg" disabled={!allBalanced} onClick={() => setConfirming(true)}>
              <ClipboardCheck /> Close trip
            </button>
          </div>
        </section>
      )}

      {trip.status === 'CLOSED' && (
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Trip results</h2>
            <span className="text-muted trip-help">
              Closed by {trip.closedByName || 'Admin'} · {formatDateTime(trip.closedAt)}
            </span>
          </div>
          <div className="trip-summary">
            <div className="is-sold">
              <strong>{trip.totals.sold}</strong>
              <span>Sold</span>
            </div>
            <div className="is-back">
              <strong>{trip.totals.returned}</strong>
              <span>Returned to stock</span>
            </div>
            <div className="is-lost">
              <strong>{trip.totals.lost}</strong>
              <span>Lost</span>
            </div>
            <div className="is-sales">
              <strong>{formatCurrency(trip.totals.salesAmount)}</strong>
              <span>Sales</span>
            </div>
          </div>
          <div className="trip-table-wrap">
            <table className="trip-table trip-table--readonly">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Out</th>
                  <th className="num">Sold</th>
                  <th className="num">Returned</th>
                  <th className="num">Lost</th>
                  <th className="num">Sales</th>
                </tr>
              </thead>
              <tbody>
                {trip.items.map((i) => (
                  <tr key={i._id}>
                    <td data-label="Product">
                      <strong>{i.productName}</strong>
                      <small>{[i.categoryName, i.variantLabel].filter(Boolean).join(' · ')}</small>
                    </td>
                    <td data-label="Out" className="num">{i.quantityOut}</td>
                    <td data-label="Sold" className="num is-sold">{i.quantitySold}</td>
                    <td data-label="Returned" className="num is-back">{i.quantityReturned}</td>
                    <td data-label="Lost" className="num is-lost">
                      {i.quantityLost}
                      {i.quantityLost > 0 && <small>{LOSS_REASONS[i.lossReason]?.label}</small>}
                    </td>
                    <td data-label="Sales" className="num">{formatCurrency(i.salesAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(trip.closingNotes || trip.totals.lost > 0) && (
            <div className="admin-card__body trip-footnotes">
              {trip.closingNotes && <p>“{trip.closingNotes}”</p>}
              {trip.totals.lost > 0 && (
                <p className="text-muted">
                  Losses from this trip are listed in <Link to="/admin/losses" className="link">Mortality &amp; Losses</Link>.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {trip.status === 'CANCELLED' && (
        <section className="admin-card">
          <div className="admin-card__body trip-cancelled">
            <Undo2 aria-hidden="true" />
            <div>
              <strong>Trip cancelled — all {trip.totals.out} units were returned to stock.</strong>
              <p className="text-muted">
                {trip.cancelledByName ? `By ${trip.cancelledByName} · ` : ''}
                {formatDateTime(trip.cancelledAt)}
                {trip.cancelReason ? ` · “${trip.cancelReason}”` : ''}
              </p>
            </div>
          </div>
        </section>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Close ${trip.tripNumber}?`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Back
            </button>
            <button type="button" className="btn btn--primary" onClick={close} disabled={busy}>
              {busy && <span className="spinner" />} Confirm & close
            </button>
          </>
        }
      >
        <ul className="trip-confirm">
          <li className="is-sold">
            <strong>{planned.sold}</strong> sold for {formatCurrency(planned.sales)}
          </li>
          <li className="is-back">
            <strong>{planned.returned}</strong> go back into stock now
          </li>
          <li className="is-lost">
            <strong>{planned.lost}</strong> recorded in Mortality &amp; Losses
          </li>
        </ul>
        <p className="text-muted trip-help">A closed trip cannot be edited.</p>
      </Modal>

      <Modal
        open={cancelling}
        onClose={() => setCancelling(false)}
        title="Cancel this trip?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setCancelling(false)} disabled={busy}>
              Back
            </button>
            <button type="button" className="btn btn--danger" onClick={cancel} disabled={busy}>
              {busy && <span className="spinner" />} Cancel trip & restock
            </button>
          </>
        }
      >
        <div className="stack">
          <p className="text-muted">
            Use this only if the trip did not go ahead. All {trip.totals.out} units return to stock. If anything was sold, close the trip instead.
          </p>
          <FormField label="Reason (optional)">
            <input className="input" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} maxLength={500} />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
