import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hotel, UtensilsCrossed, Store, Truck, ShoppingCart, ChefHat, Briefcase, Send, CalendarClock, Scale, UserCheck } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import FormField from '../components/FormField';
import FeatureGrid from '../components/FeatureGrid';
import useFetch from '../hooks/useFetch';
import { catalogService } from '../services/catalogService';
import { siteService } from '../services/siteService';
import { useContent } from '../context/ContentContext';
import { BUSINESS_TYPES } from '../utils/constants';
import { PAGE_IMAGES, withFallback } from '../assets/images';
import './BulkOrdersPage.css';

const AUDIENCE = [
  { icon: Hotel, label: 'Hotels' },
  { icon: UtensilsCrossed, label: 'Restaurants' },
  { icon: Store, label: 'Retailers' },
  { icon: Truck, label: 'Distributors' },
  { icon: ShoppingCart, label: 'Supermarkets' },
  { icon: ChefHat, label: 'Caterers' },
  { icon: Briefcase, label: 'Businesses' },
];

export default function BulkOrdersPage() {
  const bulk = useContent('bulk');
  const [params] = useSearchParams();
  const categories = useFetch(() => catalogService.listCategories(), []);
  const empty = {
    businessName: '',
    businessType: 'Hotel',
    contactPerson: '',
    phone: '',
    email: '',
    product: params.get('product') || '',
    quantity: '',
    preferredWeight: '',
    deliveryLocation: '',
    message: '',
  };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ sending: false, success: '', error: '' });
  const formRef = useRef(null);
  const alertRef = useRef(null);

  // Bring the result message into view; it sits right above the submit button.
  const revealAlert = () => requestAnimationFrame(() => alertRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const productOptions = [...new Set([...(categories.data || []).map((c) => c.name), 'Mixed products', form.product].filter(Boolean))];

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.businessName.trim()) errs.businessName = 'Business name is required';
    if (!form.contactPerson.trim()) errs.contactPerson = 'Contact person is required';
    if (form.phone.replace(/\D/g, '').length < 7) errs.phone = 'Enter a valid phone number';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.product) errs.product = 'Choose a product';
    if (!form.quantity.trim()) errs.quantity = 'Quantity is required';
    if (!form.deliveryLocation.trim()) errs.deliveryLocation = 'Delivery location is required';
    setErrors(errs);
    if (Object.keys(errs).length) {
      const count = Object.keys(errs).length;
      setStatus({ sending: false, success: '', error: `Please complete ${count} highlighted field${count === 1 ? '' : 's'}.` });
      // Focus the first invalid field so the customer sees exactly what is missing.
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector('[aria-invalid="true"]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        first?.focus({ preventScroll: true });
      });
      return;
    }

    setStatus({ sending: true, success: '', error: '' });
    try {
      const result = await siteService.sendBulkOrder(form);
      setStatus({ sending: false, success: result.message, error: '' });
      setForm({ ...empty, product: '' });
    } catch (error) {
      setStatus({ sending: false, success: '', error: error.message });
    }
    revealAlert();
  };

  return (
    <>
      <SEO title="Bulk Orders" description={bulk.heroSubtitle} />
      <PageHero title={bulk.heroTitle} subtitle={bulk.heroSubtitle} image={PAGE_IMAGES.bulk} crumbs={[{ label: 'Bulk Orders' }]}>
        <div className="bulk-audience">
          {AUDIENCE.map(({ icon: Icon, label }) => (
            <span key={label}>
              <Icon aria-hidden="true" /> {label}
            </span>
          ))}
        </div>
      </PageHero>

      <section className="section">
        <div className="container bulk-layout">
          <div className="bulk-info">
            <p className="bulk-info__intro">{bulk.intro}</p>
            <FeatureGrid items={bulk.benefits} icons={[CalendarClock, Scale, UserCheck]} columns={1} />
          </div>

          <form id="bulk-form" ref={formRef} className="card bulk-form" onSubmit={submit} noValidate>
            <h2 className="display-title">Request Bulk Supply</h2>
            <div className="form-grid">
              <FormField label="Business name" required error={errors.businessName}>
                <input className="input" value={form.businessName} onChange={set('businessName')} autoComplete="organization" />
              </FormField>
              <FormField label="Business type">
                <select className="select" value={form.businessType} onChange={set('businessType')}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Contact person" required error={errors.contactPerson}>
                <input className="input" value={form.contactPerson} onChange={set('contactPerson')} autoComplete="name" />
              </FormField>
              <FormField label="Phone" required error={errors.phone}>
                <input className="input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </FormField>
              <FormField label="Email" required error={errors.email} className="span-all">
                <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              </FormField>
              <FormField label="Product" required error={errors.product}>
                <select className="select" value={form.product} onChange={set('product')}>
                  <option value="">Select product</option>
                  {productOptions.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Quantity" required error={errors.quantity} hint="e.g. 200 birds weekly, 50 crates">
                <input className="input" value={form.quantity} onChange={set('quantity')} />
              </FormField>
              <FormField label="Preferred weight / size" hint="e.g. 2.0–2.5 kg, 30-egg trays">
                <input className="input" value={form.preferredWeight} onChange={set('preferredWeight')} />
              </FormField>
              <FormField label="Delivery location" required error={errors.deliveryLocation}>
                <input className="input" value={form.deliveryLocation} onChange={set('deliveryLocation')} />
              </FormField>
              <FormField label="Message" className="span-all" hint="Delivery frequency, timelines or other requirements">
                <textarea className="textarea" value={form.message} onChange={set('message')} maxLength={3000} />
              </FormField>
            </div>
            <div ref={alertRef} aria-live="polite">
              {status.success && <div className="form-alert form-alert--success">{status.success}</div>}
              {status.error && <div className="form-alert form-alert--error">{status.error}</div>}
            </div>
            <button type="submit" className="btn btn--accent btn--lg" disabled={status.sending}>
              {status.sending ? <span className="spinner" /> : <Send />} {status.sending ? 'Sending…' : 'Submit Request'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
