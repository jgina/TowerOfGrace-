import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, ShoppingBag } from 'lucide-react';
import SEO from '../components/SEO';
import OrderView from '../components/OrderView';
import PaymentInstructions from '../components/PaymentInstructions';
import FormField from '../components/FormField';
import { PageLoader, ErrorState } from '../components/Loader';
import useFetch from '../hooks/useFetch';
import { orderService } from '../services/orderService';
import { LAST_ORDER_KEY } from '../utils/constants';
import './OrderConfirmationPage.css';

function rememberedEmail(orderNumber) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) || 'null');
    return saved?.orderNumber === orderNumber ? saved.email : '';
  } catch {
    return '';
  }
}

export default function OrderConfirmationPage() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || rememberedEmail(orderNumber));
  const [draft, setDraft] = useState('');

  const { data: order, loading, error, reload, setData } = useFetch(
    () => (email ? orderService.track(orderNumber, email) : Promise.resolve(null)),
    [orderNumber, email]
  );

  return (
    <>
      <SEO title="Order Confirmation" noIndex />
      <section className="confirm-hero">
        <div className="container confirm-hero__inner">
          <CheckCircle2 aria-hidden="true" />
          <div>
            <span className="eyebrow">Order received</span>
            <h1 className="display-title">Thank you for your order</h1>
            <p>
              Your order number is <strong>{orderNumber}</strong>. A confirmation has been sent to your email if email notifications are enabled.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container confirm-body">
          {!email ? (
            <form
              className="card confirm-lookup"
              onSubmit={(e) => {
                e.preventDefault();
                setEmail(draft.trim());
              }}
            >
              <h2>View your order</h2>
              <p className="text-muted">Enter the email address you used at checkout.</p>
              <FormField label="Email" required>
                <input className="input" type="email" value={draft} onChange={(e) => setDraft(e.target.value)} />
              </FormField>
              <button type="submit" className="btn btn--primary">
                View order
              </button>
            </form>
          ) : loading ? (
            <PageLoader label="Loading your order…" />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : order ? (
            <>
              <PaymentInstructions order={order} onOrderUpdate={setData} />
              <OrderView order={order} />
            </>
          ) : null}

          <div className="confirm-actions">
            <Link to="/shop" className="btn btn--accent">
              <ShoppingBag /> Continue Shopping
            </Link>
            <Link to="/track-order" className="btn btn--outline">
              Track an Order
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
