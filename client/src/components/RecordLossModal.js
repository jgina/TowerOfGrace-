import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import useFetch from '../hooks/useFetch';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { lossReasonsFor } from '../utils/constants';
import './RecordLossModal.css';

const today = () => new Date().toISOString().slice(0, 10);
// preset may be undefined or null (nothing pre-selected).
const blank = (preset) => ({
  productId: preset?.productId || '',
  variantId: preset?.variantId || '',
  quantity: '',
  reason: '',
  occurredOn: today(),
  notes: '',
});

/**
 * Records dead birds, broken eggs and other losses. Saving deducts the quantity from stock immediately.
 * preset: { productId, variantId } to open pre-selected (e.g. from the inventory ledger).
 */
export default function RecordLossModal({ open, onClose, onSaved, preset }) {
  const toast = useToast();
  const [form, setForm] = useState(blank(preset));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const products = useFetch(() => (open ? adminService.listProducts({ limit: 100 }).then((r) => r.products) : Promise.resolve([])), [open]);

  useEffect(() => {
    if (open) {
      setForm(blank(preset));
      setError('');
    }
  }, [open, preset]);

  const product = products.data?.find((p) => p._id === form.productId);
  const variants = product?.variants || [];
  const holder = variants.length ? variants.find((v) => v._id === form.variantId) : product;
  const available = holder ? Math.max((holder.stock || 0) - (holder.reservedStock || 0), 0) : null;
  const reasons = useMemo(() => lossReasonsFor(product?.category?.slug), [product]);
  const qty = parseInt(form.quantity, 10);
  const tooMany = available !== null && qty > available;
  const isEggs = product?.category?.slug === 'eggs';
  const isMeat = product?.category?.slug === 'prepared-meat';

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.productId) return setError('Choose a product');
    if (variants.length && !form.variantId) return setError('Choose which option was affected');
    if (!Number.isInteger(qty) || qty < 1) return setError('Enter a quantity of at least 1');
    if (tooMany) return setError(`Only ${available} unreserved unit(s) are in stock for this option`);
    if (!form.reason) return setError('Choose a reason');
    setBusy(true);
    try {
      const result = await adminService.recordLoss({ ...form, quantity: qty, variantId: form.variantId || undefined });
      toast.success(result.message);
      onSaved?.(result.record);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record mortality / loss"
      subtitle="The quantity is deducted from stock as soon as you save."
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="loss-form" className="btn btn--danger" disabled={busy || tooMany}>
            {busy && <span className="spinner" />} Record & deduct stock
          </button>
        </>
      }
    >
      <form id="loss-form" className="form-grid" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error span-all">{error}</div>}
        <FormField label="Product" required className="span-all">
          <select
            className="select"
            value={form.productId}
            onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value, variantId: '', reason: '' }))}
            disabled={products.loading}
          >
            <option value="">{products.loading ? 'Loading products…' : 'Select product'}</option>
            {(products.data || []).map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
                {p.category?.name ? ` — ${p.category.name}` : ''}
              </option>
            ))}
          </select>
        </FormField>

        {variants.length > 0 && (
          <FormField label={isEggs ? 'Pack size affected' : 'Weight option affected'} required className="span-all">
            <select className="select" value={form.variantId} onChange={set('variantId')}>
              <option value="">Select option</option>
              {variants.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.label} — {Math.max((v.stock || 0) - (v.reservedStock || 0), 0)} available
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField
          label={isEggs ? 'Quantity lost (packs)' : isMeat ? 'Quantity lost (units)' : 'Number of birds'}
          required
          error={tooMany ? `Only ${available} unreserved in stock` : undefined}
          hint={available !== null && !tooMany ? `${available} unreserved in stock${Number.isInteger(qty) && qty > 0 ? ` → ${available - qty} after` : ''}` : undefined}
        >
          <input className="input" type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} />
        </FormField>

        <FormField label="Reason" required>
          <select className="select" value={form.reason} onChange={set('reason')} disabled={!product}>
            <option value="">Select reason</option>
            {reasons.map(([code, r]) => (
              <option key={code} value={code}>
                {r.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Date of loss" required>
          <input className="input" type="date" max={today()} value={form.occurredOn} onChange={set('occurredOn')} />
        </FormField>

        <FormField label="Notes" hint="e.g. pen/house number, symptoms observed, vet advice" className="span-all">
          <textarea className="textarea" rows={3} maxLength={1000} value={form.notes} onChange={set('notes')} />
        </FormField>

        {holder && holder.reservedStock > 0 && (
          <p className="loss-note span-all">
            <AlertTriangle aria-hidden="true" /> {holder.reservedStock} unit(s) of this option are reserved by pending orders and cannot be
            written off here. If reserved birds died, cancel or adjust those orders first.
          </p>
        )}
      </form>
    </Modal>
  );
}
