import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Phone, Mail, MapPin, Truck, CalendarDays, RefreshCw, StickyNote, Send, User } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import StatusBadge from '../../components/StatusBadge';
import SmartImage from '../../components/SmartImage';
import FormField from '../../components/FormField';
import { OrderTimeline } from '../../components/OrderView';
import AdminPaymentReview from '../../components/AdminPaymentReview';
import { ConfirmDialog } from '../../components/Modal';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '../../utils/constants';
import { formatCurrency, formatDate, formatDateTime, humanize } from '../../utils/format';
import './AdminOrderDetailsPage.css';

export default function AdminOrderDetailsPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: order, loading, error, reload, setData } = useFetch(() => adminService.getOrder(id), [id]);
  const [status, setStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [payment, setPayment] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (loading) return <PageLoader label="Loading order…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const terminal = ['COMPLETED', 'CANCELLED'].includes(order.orderStatus);
  const online = ['PAYSTACK', 'FLUTTERWAVE'].includes(order.paymentMethod);

  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      await fn();
      toast.success(success);
      await reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const applyStatus = () => {
    const next = status || order.orderStatus;
    if (next === 'CANCELLED') {
      setConfirmCancel(true);
      return;
    }
    run('status', () => adminService.updateOrderStatus(order._id, next, statusNote), `Order marked ${humanize(next)}`).then(() => {
      setStatus('');
      setStatusNote('');
    });
  };

  const addNote = (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    run('note', async () => setData(await adminService.addOrderNote(order._id, note.trim())), 'Note added').then(() => setNote(''));
  };

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/orders', label: 'Orders' }}
        eyebrow={`Placed ${formatDateTime(order.createdAt)}`}
        title={order.orderNumber}
        actions={
          <div className="row row--wrap">
            <StatusBadge status={order.orderStatus} />
            <StatusBadge status={order.paymentStatus}>{`Payment ${humanize(order.paymentStatus)}`}</StatusBadge>
          </div>
        }
      />

      <section className="admin-card aod-timeline">
        <OrderTimeline status={order.orderStatus} />
      </section>

      <div className="aod-grid">
        <div className="aod-main">
          <AdminPaymentReview order={order} onChanged={reload} />
          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Items</h2>
              <span className="text-muted">{order.items.reduce((s, i) => s + i.quantity, 0)} units</span>
            </div>
            <div className="admin-card__body">
              <ul className="aod-items">
                {order.items.map((item, i) => (
                  <li key={`${item.product}-${item.variantId || i}`}>
                    <SmartImage src={item.image} alt="" width={120} ratio="1 / 1" />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {[item.categoryName, item.variantLabel, item.sku].filter(Boolean).join(' · ')}
                      </small>
                    </div>
                    <span className="cell-number">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </span>
                    <strong className="cell-number">{formatCurrency(item.lineTotal)}</strong>
                  </li>
                ))}
              </ul>
              <dl className="aod-totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatCurrency(order.subtotal)}</dd>
                </div>
                <div>
                  <dt>Delivery ({order.deliveryMethodLabel || humanize(order.deliveryMethod)})</dt>
                  <dd>{formatCurrency(order.deliveryFee)}</dd>
                </div>
                <div className="aod-totals__grand">
                  <dt>Total</dt>
                  <dd>{formatCurrency(order.total)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Internal Notes</h2>
              <span className="text-muted">Only visible to admins</span>
            </div>
            <div className="admin-card__body">
              {order.internalNotes?.length ? (
                <ul className="aod-notes">
                  {[...order.internalNotes].reverse().map((n) => (
                    <li key={n._id}>
                      <StickyNote aria-hidden="true" />
                      <div>
                        <p>{n.note}</p>
                        <small>
                          {n.authorName || 'Admin'} · {formatDateTime(n.at)}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No internal notes yet.</p>
              )}
              <form className="aod-note-form" onSubmit={addNote}>
                <textarea className="textarea" rows={2} placeholder="Add a note for the team…" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
                <button type="submit" className="btn btn--primary" disabled={busy === 'note' || !note.trim()}>
                  {busy === 'note' ? <span className="spinner" /> : <Send />} Add note
                </button>
              </form>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Status History</h2>
            </div>
            <div className="admin-card__body">
              <ul className="aod-history">
                {[...order.statusHistory].reverse().map((h) => (
                  <li key={h._id}>
                    <StatusBadge status={h.status} size="sm" />
                    <span>{h.note}</span>
                    <small>
                      {h.changedBy?.name ? `${h.changedBy.name} · ` : ''}
                      {formatDateTime(h.at)}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="aod-side">
          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Order Status</h2>
            </div>
            <div className="admin-card__body stack">
              {terminal ? (
                <p className="text-muted">This order is {order.orderStatus.toLowerCase()} and can no longer change status.</p>
              ) : (
                <>
                  <FormField label="Change status to">
                    <select className="select" value={status || order.orderStatus} onChange={(e) => setStatus(e.target.value)}>
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {humanize(s)}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Note (optional)" hint="Saved in the status history">
                    <input className="input" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} maxLength={500} />
                  </FormField>
                  <button type="button" className="btn btn--primary" disabled={!status || status === order.orderStatus || busy === 'status'} onClick={applyStatus}>
                    {busy === 'status' && <span className="spinner" />} Update status
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Payment</h2>
              <StatusBadge status={order.paymentStatus} size="sm" />
            </div>
            <div className="admin-card__body stack">
              <dl className="aod-facts">
                <div>
                  <dt>Method</dt>
                  <dd>{PAYMENT_METHODS[order.paymentMethod]?.label}</dd>
                </div>
                {order.paymentReference && (
                  <div>
                    <dt>Reference</dt>
                    <dd className="aod-mono">{order.paymentReference}</dd>
                  </div>
                )}
                {order.paidAt && (
                  <div>
                    <dt>Paid</dt>
                    <dd>{formatDateTime(order.paidAt)}</dd>
                  </div>
                )}
              </dl>
              {online && order.paymentReference && order.paymentStatus !== 'PAID' && (
                <button
                  type="button"
                  className="btn btn--outline"
                  disabled={busy === 'recheck'}
                  onClick={() => run('recheck', () => adminService.recheckPayment(order._id), 'Payment re-checked with gateway')}
                >
                  {busy === 'recheck' ? <span className="spinner" /> : <RefreshCw />} Re-check with gateway
                </button>
              )}
              <FormField label="Set payment status" hint={online ? 'Online payments are marked paid only by gateway verification.' : 'Use after confirming a bank transfer or cash payment.'}>
                <select className="select" value={payment || order.paymentStatus} onChange={(e) => setPayment(e.target.value)}>
                  {PAYMENT_STATUSES.filter((s) => !(online && s === 'PAID' && order.paymentStatus !== 'PAID')).map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Payment note">
                <input className="input" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="e.g. Transfer received from GTBank" />
              </FormField>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!payment || payment === order.paymentStatus || busy === 'payment'}
                onClick={() =>
                  run('payment', () => adminService.updatePaymentStatus(order._id, payment, paymentNote), 'Payment status updated').then(() => {
                    setPayment('');
                    setPaymentNote('');
                  })
                }
              >
                {busy === 'payment' && <span className="spinner" />} Save payment status
              </button>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Customer</h2>
              {order.user && (
                <Link to={`/admin/customers/${order.user._id}`} className="link">
                  Profile
                </Link>
              )}
            </div>
            <div className="admin-card__body aod-contact">
              <span>
                <User /> {order.customer.fullName} {!order.user && <small className="text-muted">(guest)</small>}
              </span>
              <a href={`tel:${order.customer.phone}`}>
                <Phone /> {order.customer.phone}
              </a>
              <a href={`mailto:${order.customer.email}`}>
                <Mail /> {order.customer.email}
              </a>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Delivery</h2>
            </div>
            <div className="admin-card__body aod-contact">
              <span>
                <Truck /> {order.deliveryMethodLabel || humanize(order.deliveryMethod)}
              </span>
              {order.deliveryAddress?.address && (
                <span>
                  <MapPin /> {order.deliveryAddress.address}, {order.deliveryAddress.city}, {order.deliveryAddress.state}
                </span>
              )}
              {order.preferredDeliveryDate && (
                <span>
                  <CalendarDays /> Preferred: {formatDate(order.preferredDeliveryDate)}
                </span>
              )}
              {order.notes && <p className="aod-customer-note">“{order.notes}”</p>}
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message="Reserved stock will be returned to inventory (or restocked if already deducted). This cannot be undone."
        confirmLabel="Cancel order"
        danger
        busy={busy === 'status'}
        onConfirm={() =>
          run('status', () => adminService.updateOrderStatus(order._id, 'CANCELLED', statusNote), 'Order cancelled').then(() => {
            setConfirmCancel(false);
            setStatus('');
            setStatusNote('');
          })
        }
        onClose={() => setConfirmCancel(false)}
      />
    </>
  );
}
