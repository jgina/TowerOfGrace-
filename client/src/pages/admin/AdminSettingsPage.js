import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Info, CheckCircle2, XCircle } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import FormField from '../../components/FormField';
import ImageUploader from '../../components/ImageUploader';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { orderService } from '../../services/orderService';
import { useToast } from '../../context/ToastContext';
import { useContent } from '../../context/ContentContext';
import './AdminSettingsPage.css';

const codeFrom = (label) =>
  label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || `METHOD_${Date.now()}`;

export default function AdminSettingsPage() {
  const toast = useToast();
  const { refresh } = useContent();
  const settings = useFetch(() => adminService.getContent('settings').then((r) => r.data), []);
  const gateways = useFetch(() => orderService.paymentConfig(), []);
  const uploads = useFetch(() => adminService.uploadStatus(), []);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  if (settings.loading || !form) {
    return settings.error ? <ErrorState message={settings.error} onRetry={settings.reload} /> : <PageLoader />;
  }

  const setPayments = (field, value) => setForm((f) => ({ ...f, payments: { ...f.payments, [field]: value } }));
  const setMethod = (index, field, value) =>
    setForm((f) => ({ ...f, deliveryMethods: f.deliveryMethods.map((m, i) => (i === index ? { ...m, [field]: value } : m)) }));

  const save = async () => {
    const methods = form.deliveryMethods.map((m) => ({ ...m, code: m.code || codeFrom(m.label), fee: Number(m.fee) || 0 }));
    if (methods.some((m) => !m.label.trim())) {
      toast.error('Every delivery method needs a name');
      return;
    }
    if (methods.some((m) => m.fee < 0)) {
      toast.error('Delivery fees cannot be negative');
      return;
    }
    if (new Set(methods.map((m) => m.code)).size !== methods.length) {
      toast.error('Two delivery methods have the same name');
      return;
    }
    setSaving(true);
    try {
      await adminService.saveContent('settings', { ...form, deliveryMethods: methods });
      setForm((f) => ({ ...f, deliveryMethods: methods }));
      refresh();
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const gatewayStatus = gateways.data?.methods || {};

  return (
    <>
      <AdminPageHeader
        eyebrow="Website"
        title="Settings"
        subtitle="Brand logo, delivery options and fees, and payment methods."
        actions={
          <button type="button" className="btn btn--accent" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : <Save />} Save Settings
          </button>
        }
      />

      <div className="settings-grid">
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Brand Logo</h2>
          </div>
          <div className="admin-card__body stack">
            <div className="admin-hint">
              <Info /> Upload the official Tower of Grace logo exactly as supplied. It is displayed at its original proportions and never recoloured.
            </div>
            {uploads.data === false && <p className="field__error">Cloudinary is not configured, so uploads are disabled. You can also place the logo at client/public/brand/logo.png.</p>}
            <ImageUploader folder="brand" label="Logo" value={form.logo || null} onChange={(logo) => setForm((f) => ({ ...f, logo }))} hint="PNG or SVG-exported PNG with a transparent background works best" />
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Feed &amp; Medicine Alerts</h2>
          </div>
          <div className="admin-card__body stack">
            <FormField
              label="Email the boss when feed or medicine runs low"
              hint="One or more addresses, separated by commas. Sent once when a feed or medicine reaches its alert level, and when a medicine is about to expire."
            >
              <input
                className="input"
                type="text"
                value={form.feedAlertEmails || ''}
                onChange={(e) => setForm((f) => ({ ...f, feedAlertEmails: e.target.value }))}
                placeholder="boss@example.com, manager@example.com"
              />
            </FormField>
            <p className="field__hint">Emails also need the email settings (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD) in the server .env file. The in-app alert works regardless.</p>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Payment Methods</h2>
          </div>
          <div className="admin-card__body stack">
            <ul className="gateway-list">
              {['PAYSTACK', 'FLUTTERWAVE'].map((g) => (
                <li key={g}>
                  {gatewayStatus[g] ? <CheckCircle2 className="ok" /> : <XCircle className="off" />}
                  <span>
                    <strong>{g === 'PAYSTACK' ? 'Paystack' : 'Flutterwave'}</strong>
                    <small>{gatewayStatus[g] ? 'Connected (secret key set on server)' : `Not configured — set ${g}_SECRET_KEY in the server .env`}</small>
                  </span>
                </li>
              ))}
            </ul>
            <label className="switch">
              <input type="checkbox" checked={form.payments.payOnDeliveryEnabled !== false} onChange={(e) => setPayments('payOnDeliveryEnabled', e.target.checked)} />
              <span className="switch__track" /> Allow pay on delivery / pickup
            </label>
            <label className="switch">
              <input type="checkbox" checked={form.payments.bankTransferEnabled !== false} onChange={(e) => setPayments('bankTransferEnabled', e.target.checked)} />
              <span className="switch__track" /> Allow direct bank transfer
            </label>
            {form.payments.bankTransferEnabled !== false && (
              <div className="form-grid">
                <FormField label="Bank name">
                  <input className="input" value={form.payments.bankName || ''} onChange={(e) => setPayments('bankName', e.target.value)} />
                </FormField>
                <FormField label="Account number">
                  <input className="input" inputMode="numeric" value={form.payments.accountNumber || ''} onChange={(e) => setPayments('accountNumber', e.target.value)} />
                </FormField>
                <FormField label="Account name" className="span-all">
                  <input className="input" value={form.payments.accountName || ''} onChange={(e) => setPayments('accountName', e.target.value)} />
                </FormField>
                <FormField label="Transfer instructions" className="span-all">
                  <textarea className="textarea" rows={2} value={form.payments.instructions || ''} onChange={(e) => setPayments('instructions', e.target.value)} />
                </FormField>
              </div>
            )}
          </div>
        </section>

        <section className="admin-card settings-grid__wide">
          <div className="admin-card__head">
            <h2>Delivery Methods & Fees</h2>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  deliveryMethods: [...f.deliveryMethods, { code: '', label: '', description: '', fee: 0, requiresAddress: true, isActive: true }],
                }))
              }
            >
              <Plus /> Add method
            </button>
          </div>
          <div className="admin-card__body stack">
            <div className="admin-hint">
              <Info /> Delivery fees are applied by the server at checkout. Set 0 for free delivery or pickup.
            </div>
            {form.deliveryMethods.map((m, index) => (
              <div key={m.code || index} className={`delivery-row ${m.isActive === false ? 'is-inactive' : ''}`}>
                <div className="form-grid form-grid--3">
                  <FormField label="Name" required>
                    <input className="input" value={m.label} onChange={(e) => setMethod(index, 'label', e.target.value)} />
                  </FormField>
                  <FormField label="Fee (₦)">
                    <input className="input" type="number" min="0" step="50" value={m.fee} onChange={(e) => setMethod(index, 'fee', e.target.value)} />
                  </FormField>
                  <FormField label="Code" hint="Set automatically from the name">
                    <input className="input" value={m.code || codeFrom(m.label || '')} disabled />
                  </FormField>
                  <FormField label="Description" className="span-all">
                    <input className="input" value={m.description || ''} onChange={(e) => setMethod(index, 'description', e.target.value)} />
                  </FormField>
                </div>
                <div className="delivery-row__foot">
                  <label className="switch">
                    <input type="checkbox" checked={m.requiresAddress !== false} onChange={(e) => setMethod(index, 'requiresAddress', e.target.checked)} />
                    <span className="switch__track" /> Requires delivery address
                  </label>
                  <label className="switch">
                    <input type="checkbox" checked={m.isActive !== false} onChange={(e) => setMethod(index, 'isActive', e.target.checked)} />
                    <span className="switch__track" /> Available at checkout
                  </label>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setForm((f) => ({ ...f, deliveryMethods: f.deliveryMethods.filter((_, i) => i !== index) }))}
                    disabled={form.deliveryMethods.length <= 1}
                  >
                    <Trash2 /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
