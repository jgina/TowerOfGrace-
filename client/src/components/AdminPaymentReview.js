import { useState } from 'react';
import { BadgeCheck, FileText, ExternalLink, XCircle, Landmark, Banknote } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import StatusBadge from './StatusBadge';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDateTime } from '../utils/format';
import './AdminPaymentReview.css';

const isImage = (proof) => (proof.mimeType || '').startsWith('image/');

/**
 * Payment confirmation panel for bank-transfer and pay-on-delivery orders:
 * shows uploaded receipts, a "money received" confirmation and a reject-with-reason flow.
 */
export default function AdminPaymentReview({ order, onChanged }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const manual = ['BANK_TRANSFER', 'PAY_ON_DELIVERY'].includes(order.paymentMethod);
  const proofs = [...(order.paymentProofs || [])].reverse();
  if (!manual && !proofs.length) return null;

  const paid = order.paymentStatus === 'PAID';
  const cancelled = order.orderStatus === 'CANCELLED';
  const pendingProof = proofs.find((p) => p.status === 'PENDING');

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await adminService.confirmPayment(order._id, note);
      toast.success(result.message);
      setConfirming(false);
      setNote('');
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reason.trim()) {
      toast.error('Give the customer a reason');
      return;
    }
    setBusy(true);
    try {
      const result = await adminService.rejectPaymentProof(order._id, reason.trim());
      toast.success(result.message);
      setRejecting(false);
      setReason('');
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`admin-card payment-review ${pendingProof && !paid ? 'payment-review--attention' : ''}`}>
      <div className="admin-card__head">
        <h2>Payment Confirmation</h2>
        {paid ? (
          <StatusBadge status="PAID">Money received</StatusBadge>
        ) : pendingProof ? (
          <StatusBadge tone="info">Receipt to review</StatusBadge>
        ) : (
          <StatusBadge status="PENDING">Awaiting payment</StatusBadge>
        )}
      </div>
      <div className="admin-card__body stack">
        {paid ? (
          <div className="payment-review__paid">
            <BadgeCheck aria-hidden="true" />
            <div>
              <strong>{formatCurrency(order.total)} confirmed as received</strong>
              <span>{order.paidAt ? formatDateTime(order.paidAt) : ''} · the customer was notified by email and on their order page.</span>
            </div>
          </div>
        ) : (
          <p className="payment-review__lead">
            {order.paymentMethod === 'BANK_TRANSFER' ? <Landmark aria-hidden="true" /> : <Banknote aria-hidden="true" />}
            {order.paymentMethod === 'BANK_TRANSFER'
              ? `Check that ${formatCurrency(order.total)} with reference ${order.orderNumber} has arrived in the account before confirming.`
              : `Confirm once ${formatCurrency(order.total)} has been collected on delivery or pickup.`}
          </p>
        )}

        {proofs.length > 0 ? (
          <ul className="receipt-list">
            {proofs.map((proof) => (
              <li key={proof._id} className={`receipt-item receipt-item--${proof.status.toLowerCase()}`}>
                <a href={proof.url} target="_blank" rel="noreferrer" className="receipt-item__preview" aria-label="Open receipt">
                  {isImage(proof) ? <img src={proof.url} alt={`Receipt uploaded ${formatDateTime(proof.uploadedAt)}`} /> : <FileText aria-hidden="true" />}
                </a>
                <div className="receipt-item__info">
                  <div className="row row--wrap">
                    <StatusBadge tone={proof.status === 'ACCEPTED' ? 'success' : proof.status === 'REJECTED' ? 'danger' : 'info'} size="sm">
                      {proof.status === 'PENDING' ? 'Awaiting review' : proof.status.toLowerCase()}
                    </StatusBadge>
                    <small>{formatDateTime(proof.uploadedAt)}</small>
                  </div>
                  {proof.fileName && <span className="receipt-item__name">{proof.fileName}</span>}
                  {proof.note && <span className="receipt-item__note">Customer note: “{proof.note}”</span>}
                  {proof.reviewNote && <span className="receipt-item__note">Rejection reason: {proof.reviewNote}</span>}
                  <a href={proof.url} target="_blank" rel="noreferrer" className="link receipt-item__open">
                    <ExternalLink /> Open full receipt
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          order.paymentMethod === 'BANK_TRANSFER' && !paid && <p className="text-muted">The customer has not uploaded a receipt yet. You can still confirm if the money has arrived.</p>
        )}

        {!paid && !cancelled && (
          <div className="payment-review__actions">
            {pendingProof && (
              <button type="button" className="btn btn--ghost" onClick={() => setRejecting(true)}>
                <XCircle /> Reject receipt
              </button>
            )}
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setConfirming(true)}>
              <BadgeCheck /> Confirm money received
            </button>
          </div>
        )}
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Confirm money received?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={confirm} disabled={busy}>
              {busy && <span className="spinner" />} Yes, money received
            </button>
          </>
        }
      >
        <div className="stack">
          <p className="text-muted">
            Order {order.orderNumber} will be marked <strong>paid</strong> and <strong>confirmed</strong>, its stock deducted, and{' '}
            {order.customer.fullName} will receive a confirmation email and see it on their order page.
          </p>
          <FormField label="Note (optional)" hint="e.g. Received from GTBank — J. Doe">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Reject this receipt?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setRejecting(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn--danger" onClick={reject} disabled={busy || !reason.trim()}>
              {busy && <span className="spinner" />} Reject & notify customer
            </button>
          </>
        }
      >
        <FormField label="Reason (sent to the customer)" required hint="e.g. No matching transfer found; amount is less than the order total">
          <textarea className="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </FormField>
      </Modal>
    </section>
  );
}
