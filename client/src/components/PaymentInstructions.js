import { useEffect, useRef, useState } from 'react';
import { CreditCard, Landmark, Banknote, Copy, BadgeCheck } from 'lucide-react';
import ReceiptUpload from './ReceiptUpload';
import useFetch from '../hooks/useFetch';
import { orderService } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDateTime } from '../utils/format';
import { PAYMENT_METHODS } from '../utils/constants';
import './PaymentInstructions.css';

const POLL_MS = 20000;

/**
 * What the customer needs to do next to pay for an order, and live confirmation once paid.
 * Never implies payment succeeded unless the API says PAID.
 * onOrderUpdate(order) lets the page refresh its copy when a receipt is uploaded or payment is confirmed.
 */
export default function PaymentInstructions({ order, onOrderUpdate }) {
  const toast = useToast();
  const [starting, setStarting] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const config = useFetch(() => orderService.paymentConfig(), []);
  const bank = config.data?.bankTransfer;
  const previousStatus = useRef(order.paymentStatus);

  const isBankTransfer = order.paymentMethod === 'BANK_TRANSFER';
  const awaitingReview = isBankTransfer && order.paymentStatus !== 'PAID' && order.paymentProofs?.some((p) => p.status === 'PENDING');

  // While a receipt is under review, quietly re-check so the page updates the moment the admin confirms.
  useEffect(() => {
    if (!awaitingReview || !onOrderUpdate) return undefined;
    const timer = setInterval(() => {
      if (document.hidden) return;
      orderService
        .track(order.orderNumber, order.customer.email)
        .then(onOrderUpdate)
        .catch(() => null);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [awaitingReview, onOrderUpdate, order.orderNumber, order.customer.email]);

  useEffect(() => {
    if (previousStatus.current !== 'PAID' && order.paymentStatus === 'PAID') {
      setJustConfirmed(true);
      toast.success('Your payment has been confirmed!');
    }
    previousStatus.current = order.paymentStatus;
  }, [order.paymentStatus, toast]);

  if (order.paymentStatus === 'PAID') {
    return (
      <div className={`pay-box pay-box--success ${justConfirmed ? 'pay-box--celebrate' : ''}`} role="status">
        <BadgeCheck aria-hidden="true" />
        <div>
          <strong>Payment confirmed</strong>
          <p>
            We received your payment of {formatCurrency(order.total)}
            {order.paidAt ? ` on ${formatDateTime(order.paidAt)}` : ''}. Your order is confirmed and being prepared.
          </p>
        </div>
      </div>
    );
  }
  if (order.orderStatus === 'CANCELLED') return null;

  const payNow = async () => {
    setStarting(true);
    try {
      const session = await orderService.initializePayment(order._id, order.customer.email);
      window.location.assign(session.authorizationUrl);
    } catch (error) {
      toast.error(error.message);
      setStarting(false);
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text).then(() => toast.success('Copied'), () => null);
  };

  if (['PAYSTACK', 'FLUTTERWAVE'].includes(order.paymentMethod)) {
    return (
      <div className="pay-box pay-box--warning">
        <CreditCard aria-hidden="true" />
        <div>
          <strong>{order.paymentStatus === 'FAILED' ? 'Your payment did not go through' : 'Payment not completed yet'}</strong>
          <p>
            Complete payment of {formatCurrency(order.total)} with {PAYMENT_METHODS[order.paymentMethod].label} to confirm your order.
          </p>
        </div>
        <button type="button" className="btn btn--accent" onClick={payNow} disabled={starting}>
          {starting && <span className="spinner" />} Pay {formatCurrency(order.total)}
        </button>
      </div>
    );
  }

  if (isBankTransfer) {
    const hasBank = bank?.accountNumber;
    return (
      <div className="pay-box pay-box--stacked">
        <div className="pay-box__row">
          <Landmark aria-hidden="true" />
          <div className="pay-box__body">
            <strong>{awaitingReview ? 'Transfer details' : 'Complete your bank transfer'}</strong>
            {hasBank ? (
              <dl className="pay-box__bank">
                <div>
                  <dt>Bank</dt>
                  <dd>{bank.bankName}</dd>
                </div>
                <div>
                  <dt>Account name</dt>
                  <dd>{bank.accountName}</dd>
                </div>
                <div>
                  <dt>Account number</dt>
                  <dd>
                    {bank.accountNumber}
                    <button type="button" className="icon-btn" onClick={() => copy(bank.accountNumber)} aria-label="Copy account number">
                      <Copy />
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatCurrency(order.total)}</dd>
                </div>
                <div>
                  <dt>Reference / narration</dt>
                  <dd>
                    {order.orderNumber}
                    <button type="button" className="icon-btn" onClick={() => copy(order.orderNumber)} aria-label="Copy order number">
                      <Copy />
                    </button>
                  </dd>
                </div>
              </dl>
            ) : (
              <p>Our team will contact you with bank details to complete payment of {formatCurrency(order.total)}.</p>
            )}
            {bank?.instructions && <p className="text-muted">{bank.instructions}</p>}
          </div>
        </div>
        <ReceiptUpload order={order} onUploaded={onOrderUpdate} />
      </div>
    );
  }

  return (
    <div className="pay-box">
      <Banknote aria-hidden="true" />
      <div>
        <strong>Pay on delivery</strong>
        <p>Please have {formatCurrency(order.total)} ready when your order arrives or at pickup.</p>
      </div>
    </div>
  );
}
