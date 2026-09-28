import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import FormField from '../components/FormField';
import OrderView from '../components/OrderView';
import PaymentInstructions from '../components/PaymentInstructions';
import { orderService } from '../services/orderService';
import './TrackOrderPage.css';

export default function TrackOrderPage() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({ orderNumber: params.get('orderNumber') || '', email: params.get('email') || '' });
  const [state, setState] = useState({ loading: false, order: null, error: '' });

  const lookup = useCallback(async (orderNumber, email) => {
    setState({ loading: true, order: null, error: '' });
    try {
      const order = await orderService.track(orderNumber.trim(), email.trim());
      setState({ loading: false, order, error: '' });
    } catch (error) {
      setState({ loading: false, order: null, error: error.message });
    }
  }, []);

  // Links in our emails carry the order number and email, so open the order straight away.
  useEffect(() => {
    const orderNumber = params.get('orderNumber');
    const email = params.get('email');
    if (orderNumber && email) lookup(orderNumber, email);
  }, [params, lookup]);

  const updateOrder = useCallback((order) => setState((s) => ({ ...s, order })), []);

  const submit = (e) => {
    e.preventDefault();
    lookup(form.orderNumber, form.email);
  };

  return (
    <>
      <SEO title="Track Your Order" description="Check the status of your Tower of Grace Farms order." />
      <PageHero title="Track Your Order" subtitle="Enter your order number and the email used at checkout." compact crumbs={[{ label: 'Track Order' }]} />
      <section className="section">
        <div className="container track-body">
          <form className="card track-form" onSubmit={submit}>
            <FormField label="Order number" required>
              <input
                className="input"
                placeholder="TGF-2026-000001"
                value={form.orderNumber}
                onChange={(e) => setForm({ ...form, orderNumber: e.target.value.toUpperCase() })}
              />
            </FormField>
            <FormField label="Email" required>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <button type="submit" className="btn btn--primary" disabled={state.loading}>
              {state.loading ? <span className="spinner" /> : <Search />} Track
            </button>
          </form>
          {state.error && <div className="form-alert form-alert--error">{state.error}</div>}
          {state.order && (
            <>
              <PaymentInstructions order={state.order} onOrderUpdate={updateOrder} />
              <OrderView order={state.order} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
