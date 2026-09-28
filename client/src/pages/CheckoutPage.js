import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Lock, Truck, Store, CreditCard, Landmark, Banknote, Wallet, CheckCircle2 } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import FormField from '../components/FormField';
import OrderSummary from '../components/OrderSummary';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { useToast } from '../context/ToastContext';
import useFetch from '../hooks/useFetch';
import { orderService } from '../services/orderService';
import { authService } from '../services/authService';
import { LAST_ORDER_KEY, NIGERIAN_STATES, PAYMENT_METHODS } from '../utils/constants';
import { formatCurrency } from '../utils/format';
import './CheckoutPage.css';

const PAYMENT_ICONS = { PAYSTACK: CreditCard, FLUTTERWAVE: Wallet, BANK_TRANSFER: Landmark, PAY_ON_DELIVERY: Banknote };


const today = () => new Date().toISOString().slice(0, 10);

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { settings } = useContent();
  const toast = useToast();
  const navigate = useNavigate();

  const payConfig = useFetch(() => orderService.paymentConfig(), []);
  const addresses = useFetch(() => (user ? authService.listAddresses() : Promise.resolve([])), [user?._id]);

  const deliveryMethods = (settings.deliveryMethods || []).filter((m) => m.isActive !== false);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    deliveryMethod: '',
    preferredDeliveryDate: '',
    paymentMethod: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, fullName: f.fullName || user.name, email: f.email || user.email, phone: f.phone || user.phone || '' }));
  }, [user]);

  useEffect(() => {
    const def = addresses.data?.find((a) => a.isDefault) || addresses.data?.[0];
    if (def) setForm((f) => (f.address ? f : { ...f, address: def.address, city: def.city, state: def.state, phone: f.phone || def.phone || '' }));
  }, [addresses.data]);

  useEffect(() => {
    if (!form.deliveryMethod && deliveryMethods.length) setForm((f) => ({ ...f, deliveryMethod: deliveryMethods[0].code }));
  }, [deliveryMethods, form.deliveryMethod]);

  const enabledMethods = useMemo(
    () => Object.keys(PAYMENT_METHODS).filter((code) => payConfig.data?.methods?.[code]),
    [payConfig.data]
  );

  useEffect(() => {
    if (!form.paymentMethod && enabledMethods.length) setForm((f) => ({ ...f, paymentMethod: enabledMethods[0] }));
  }, [enabledMethods, form.paymentMethod]);

  const method = deliveryMethods.find((m) => m.code === form.deliveryMethod);
  const deliveryFee = method ? Number(method.fee) || 0 : undefined;

  if (!items.length && !submitting) return <Navigate to="/cart" replace />;

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (form.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone number';
    if (!form.deliveryMethod) e.deliveryMethod = 'Choose a delivery method';
    if (method?.requiresAddress) {
      if (!form.address.trim()) e.address = 'Delivery address is required';
      if (!form.city.trim()) e.city = 'City is required';
      if (!form.state) e.state = 'State is required';
    }
    if (form.preferredDeliveryDate && form.preferredDeliveryDate < today()) e.preferredDeliveryDate = 'Choose today or a later date';
    if (!form.paymentMethod) e.paymentMethod = 'Choose a payment method';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    if (!validate()) {
      toast.error('Please check the highlighted fields');
      return;
    }
    setSubmitting(true);
    try {
      const order = await orderService.create({
        customer: { fullName: form.fullName, email: form.email, phone: form.phone },
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        deliveryAddress: { address: form.address, city: form.city, state: form.state },
        deliveryMethod: form.deliveryMethod,
        preferredDeliveryDate: form.preferredDeliveryDate || undefined,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      });

      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ orderNumber: order.orderNumber, email: order.customer.email }));
      } catch {
        /* non-critical */
      }
      clearCart();

      if (['PAYSTACK', 'FLUTTERWAVE'].includes(order.paymentMethod)) {
        try {
          const session = await orderService.initializePayment(order._id, order.customer.email);
          window.location.assign(session.authorizationUrl);
          return;
        } catch (payError) {
          toast.error(`Your order was saved, but payment could not start: ${payError.message}`);
        }
      }
      navigate(`/order-confirmation/${order.orderNumber}`, { state: { email: order.customer.email } });
    } catch (error) {
      setServerError(error.message);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <SEO title="Checkout" noIndex />
      <PageHero title="Checkout" compact crumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />

      <section className="section">
        <form className="container checkout-layout" onSubmit={submit} noValidate>
          <div className="checkout-main">
            {serverError && <div className="form-alert form-alert--error">{serverError}</div>}
            {!user && (
              <div className="form-alert form-alert--info">
                Checking out as a guest. <Link to="/login" state={{ from: '/checkout' }} className="link">Sign in</Link> to save your details and track orders in your account.
              </div>
            )}

            <fieldset className="checkout-step card">
              <legend className="checkout-step__title">
                <span>1</span> Contact Details
              </legend>
              <div className="form-grid">
                <FormField label="Full name" required error={errors.fullName} className="span-all">
                  <input className="input" value={form.fullName} onChange={set('fullName')} autoComplete="name" />
                </FormField>
                <FormField label="Email" required error={errors.email}>
                  <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
                </FormField>
                <FormField label="Phone" required error={errors.phone}>
                  <input className="input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="080..." />
                </FormField>
              </div>
            </fieldset>

            <fieldset className="checkout-step card">
              <legend className="checkout-step__title">
                <span>2</span> Delivery
              </legend>
              {deliveryMethods.length === 0 ? (
                <div className="form-alert form-alert--warning">Delivery options are being set up. Please contact us to complete your order.</div>
              ) : (
                <div className="option-cards" role="radiogroup" aria-label="Delivery method">
                  {deliveryMethods.map((m) => (
                    <label key={m.code} className={`option-card ${form.deliveryMethod === m.code ? 'is-selected' : ''}`}>
                      <input type="radio" name="deliveryMethod" value={m.code} checked={form.deliveryMethod === m.code} onChange={set('deliveryMethod')} />
                      {m.requiresAddress ? <Truck aria-hidden="true" /> : <Store aria-hidden="true" />}
                      <span className="option-card__body">
                        <strong>{m.label}</strong>
                        {m.description && <small>{m.description}</small>}
                      </span>
                      <span className="option-card__price">{Number(m.fee) ? formatCurrency(m.fee) : 'Free'}</span>
                    </label>
                  ))}
                </div>
              )}
              {errors.deliveryMethod && <span className="field__error">{errors.deliveryMethod}</span>}

              {method?.requiresAddress && (
                <div className="form-grid checkout-address">
                  {addresses.data?.length > 1 && (
                    <FormField label="Saved addresses" className="span-all">
                      <select
                        className="select"
                        onChange={(e) => {
                          const a = addresses.data.find((x) => x._id === e.target.value);
                          if (a) setForm((f) => ({ ...f, address: a.address, city: a.city, state: a.state }));
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Choose a saved address
                        </option>
                        {addresses.data.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.label} — {a.address}, {a.city}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}
                  <FormField label="Delivery address" required error={errors.address} className="span-all">
                    <input className="input" value={form.address} onChange={set('address')} autoComplete="street-address" />
                  </FormField>
                  <FormField label="City" required error={errors.city}>
                    <input className="input" value={form.city} onChange={set('city')} autoComplete="address-level2" />
                  </FormField>
                  <FormField label="State" required error={errors.state}>
                    <select className="select" value={form.state} onChange={set('state')}>
                      <option value="">Select state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>
              )}

              <div className="form-grid checkout-address">
                <FormField
                  label={method?.requiresAddress ? 'Preferred delivery date' : 'Preferred pickup date'}
                  hint="Optional. We will confirm the date with you."
                  error={errors.preferredDeliveryDate}
                >
                  <input className="input" type="date" min={today()} value={form.preferredDeliveryDate} onChange={set('preferredDeliveryDate')} />
                </FormField>
              </div>
            </fieldset>

            <fieldset className="checkout-step card">
              <legend className="checkout-step__title">
                <span>3</span> Payment Method
              </legend>
              {payConfig.loading ? (
                <div className="skeleton" style={{ height: 120 }} />
              ) : (
                <div className="option-cards option-cards--grid" role="radiogroup" aria-label="Payment method">
                  {Object.entries(PAYMENT_METHODS).map(([code, info]) => {
                    const Icon = PAYMENT_ICONS[code];
                    const enabled = enabledMethods.includes(code);
                    return (
                      <label key={code} className={`option-card ${form.paymentMethod === code ? 'is-selected' : ''} ${enabled ? '' : 'is-disabled'}`}>
                        <input type="radio" name="paymentMethod" value={code} checked={form.paymentMethod === code} onChange={set('paymentMethod')} disabled={!enabled} />
                        <Icon aria-hidden="true" />
                        <span className="option-card__body">
                          <strong>{info.label}</strong>
                          <small>{enabled ? info.description : 'Not available yet'}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.paymentMethod && <span className="field__error">{errors.paymentMethod}</span>}
              {form.paymentMethod === 'BANK_TRANSFER' && (
                <p className="checkout-hint">Bank details will be shown after you place your order. Your order is confirmed once payment is received.</p>
              )}
              {['PAYSTACK', 'FLUTTERWAVE'].includes(form.paymentMethod) && (
                <p className="checkout-hint">
                  <Lock aria-hidden="true" /> You will be redirected to {PAYMENT_METHODS[form.paymentMethod].label} to pay securely.
                </p>
              )}
            </fieldset>

            <fieldset className="checkout-step card">
              <legend className="checkout-step__title">
                <span>4</span> Order Notes
              </legend>
              <FormField label="Notes for our team" hint="Optional — e.g. landmark, preferred delivery time, special handling.">
                <textarea className="textarea" maxLength={1000} value={form.notes} onChange={set('notes')} />
              </FormField>
            </fieldset>
          </div>

          <OrderSummary items={items} subtotal={subtotal} deliveryFee={deliveryFee} deliveryLabel={method?.label}>
            <button type="submit" className="btn btn--accent btn--lg btn--block" disabled={submitting || !deliveryMethods.length}>
              {submitting ? <span className="spinner" /> : <CheckCircle2 />}
              {submitting ? 'Placing order…' : `Place Order · ${formatCurrency(subtotal + (deliveryFee || 0))}`}
            </button>
            <p className="checkout-secure">
              <Lock aria-hidden="true" /> Your details are used only to process this order.
            </p>
          </OrderSummary>
        </form>
      </section>
    </>
  );
}
