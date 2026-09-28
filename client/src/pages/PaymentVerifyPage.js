import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import SEO from '../components/SEO';
import { PageLoader } from '../components/Loader';
import { orderService } from '../services/orderService';
import { formatCurrency } from '../utils/format';
import './PaymentVerifyPage.css';

/**
 * Landing page after Paystack/Flutterwave redirects back.
 * The result shown here always comes from the server's verification with the gateway.
 */
export default function PaymentVerifyPage() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || params.get('tx_ref');
  const orderNumber = params.get('order');
  const gatewayStatus = params.get('status');
  const [state, setState] = useState({ loading: true, order: null, error: null });

  useEffect(() => {
    if (!reference) {
      setState({ loading: false, order: null, error: 'No payment reference was provided.' });
      return;
    }
    orderService
      .verifyPayment(reference)
      .then((order) => setState({ loading: false, order, error: null }))
      .catch((error) => setState({ loading: false, order: null, error: error.message }));
  }, [reference]);

  if (state.loading) return <PageLoader label="Confirming your payment with the payment provider…" />;

  const { order, error } = state;
  const paid = order?.paymentStatus === 'PAID';
  const failed = order?.paymentStatus === 'FAILED' || gatewayStatus === 'cancelled';
  const confirmationUrl = `/order-confirmation/${order?.orderNumber || orderNumber}`;

  let Icon = Clock;
  let tone = 'pending';
  let title = 'Payment is being processed';
  let text = 'We have not received confirmation from the payment provider yet. This can take a few minutes. Your order details are below.';
  if (paid) {
    Icon = CheckCircle2;
    tone = 'success';
    title = 'Payment successful';
    text = `We received ${formatCurrency(order.total)} for order ${order.orderNumber}. Your order is confirmed.`;
  } else if (failed || error) {
    Icon = XCircle;
    tone = 'failed';
    title = error ? 'We could not confirm this payment' : 'Payment was not completed';
    text = error || 'Your order is saved. You can try paying again from your order page.';
  }

  return (
    <>
      <SEO title="Payment Status" noIndex />
      <section className="section">
        <div className="container">
          <div className={`verify-card verify-card--${tone} card`}>
            <Icon aria-hidden="true" />
            <h1 className="display-title">{title}</h1>
            <p>{text}</p>
            <div className="verify-card__actions">
              {(order?.orderNumber || orderNumber) && (
                <Link to={confirmationUrl} state={{ email: order?.customer?.email }} className="btn btn--primary">
                  View Order
                </Link>
              )}
              <Link to="/shop" className="btn btn--outline">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
