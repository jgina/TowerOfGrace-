import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import useFetch from '../hooks/useFetch';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import './NewMarketTripModal.css'; // shared line-item layout (.trip-form, .trip-lines, .trip-line)
import './MoveToStockModal.css';

const newLine = () => ({ key: `${Date.now()}-${Math.random()}`, productId: '', variantId: '', quantity: '' });

/**
 * "Confirm ready & move to stock": splits a batch's live birds across product options (e.g. weight bands).
 * Only this step adds birds to shop stock.
 */
export default function MoveToStockModal({ open, onClose, batch, onDone }) {
  const toast = useToast();
  const [lines, setLines] = useState([newLine()]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const products = useFetch(() => (open ? adminService.listProducts({ limit: 100 }).then((r) => r.products) : Promise.resolve([])), [open]);

  // Offer products of the batch's own category first; any bird product is allowed.
  const options = (products.data || [])
    .filter((p) => p.category?.slug !== 'eggs')
    .sort((a, b) => (b.category?.slug === batch?.categorySlug) - (a.category?.slug === batch?.categorySlug));

  useEffect(() => {
    if (open) {
      setLines([newLine()]);
      setNote('');
      setError('');
    }
  }, [open]);

  if (!batch) return null;
  const allocated = lines.reduce((s, l) => s + (parseInt(l.quantity, 10) || 0), 0);
  const remaining = batch.live - allocated;
  const setLine = (key, changes) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...changes } : l)));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const filled = lines.filter((l) => parseInt(l.quantity, 10) > 0);
    if (!filled.length) return setError('Enter how many birds go into at least one product');
    for (const l of filled) {
      const p = options.find((o) => o._id === l.productId);
      if (!p) return setError('Choose a product on every line');
      if (p.variants?.length && !l.variantId) return setError(`Choose which option of ${p.name}`);
    }
    if (remaining < 0) return setError(`That is ${-remaining} more than the ${batch.live} live birds in this batch`);
    setBusy(true);
    try {
      const result = await adminService.transferBatch(batch._id, {
        note,
        allocations: filled.map((l) => ({ productId: l.productId, variantId: l.variantId || undefined, quantity: parseInt(l.quantity, 10) })),
      });
      toast.success(result.message);
      result.warnings?.forEach((w) => toast.error(w, { duration: 10000 }));
      onDone?.(result.batch);
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
      size="lg"
      title={`Push to main inventory · ${batch.batchCode}`}
      subtitle="Choose the product and weight option for these birds. They go on sale in the shop as soon as you confirm."
      footer={
        <>
          <span className={`move-remaining ${remaining < 0 ? 'is-over' : ''}`}>
            {remaining >= 0 ? `${remaining} of ${batch.live} birds stay in the batch` : `${-remaining} too many`}
          </span>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="move-form" className="btn btn--primary" disabled={busy || allocated === 0 || remaining < 0}>
            {busy && <span className="spinner" />} Push {allocated || ''} to inventory
          </button>
        </>
      }
    >
      <form id="move-form" className="trip-form" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error">{error}</div>}
        <div className="trip-lines">
          <div className="trip-lines__head">
            <span className="field__label">Where do the birds go?</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setLines((all) => [...all, newLine()])}>
              <Plus /> Add line
            </button>
          </div>
          {lines.map((line) => {
            const product = options.find((o) => o._id === line.productId);
            const variants = product?.variants?.filter((v) => v.isActive !== false) || [];
            return (
              <div key={line.key} className="trip-line trip-line--move">
                <select className="select" value={line.productId} onChange={(e) => setLine(line.key, { productId: e.target.value, variantId: '' })} aria-label="Product">
                  <option value="">{products.loading ? 'Loading…' : 'Select product'}</option>
                  {options.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                      {p.category?.name ? ` — ${p.category.name}` : ''}
                    </option>
                  ))}
                </select>
                {variants.length > 0 ? (
                  <select className="select" value={line.variantId} onChange={(e) => setLine(line.key, { variantId: e.target.value })} aria-label="Weight option">
                    <option value="">Select weight option</option>
                    {variants.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.label} (now {v.stock || 0} in stock)
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="trip-line__single">{product ? `Single option (now ${product.stock || 0})` : '—'}</span>
                )}
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="Birds"
                  value={line.quantity}
                  onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                  aria-label="Number of birds"
                />
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))} disabled={lines.length === 1} aria-label="Remove line">
                  <Trash2 />
                </button>
              </div>
            );
          })}
        </div>
        <FormField label="Note (optional)" hint="e.g. weighed at 2.3 kg average before sale">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </FormField>
      </form>
    </Modal>
  );
}
