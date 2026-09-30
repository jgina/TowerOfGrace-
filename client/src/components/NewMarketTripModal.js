import { useEffect, useState } from 'react';
import { Plus, Trash2, Info } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import useFetch from '../hooks/useFetch';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import './NewMarketTripModal.css';

const today = () => new Date().toISOString().slice(0, 10);
const newLine = () => ({ key: `${Date.now()}-${Math.random()}`, productId: '', variantId: '', quantity: '' });
const blankTrip = () => ({ market: '', tripDate: today(), responsiblePerson: '', vehicle: '', notes: '', lines: [newLine()] });

const unreserved = (holder) => Math.max((holder?.stock || 0) - (holder?.reservedStock || 0), 0);

/** Records birds/eggs leaving the farm for a market. Saving deducts the quantities from stock. */
export default function NewMarketTripModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [trip, setTrip] = useState(blankTrip);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const products = useFetch(() => (open ? adminService.listProducts({ limit: 100 }).then((r) => r.products) : Promise.resolve([])), [open]);

  useEffect(() => {
    if (open) {
      setTrip(blankTrip());
      setError('');
    }
  }, [open]);

  const set = (field) => (e) => setTrip((t) => ({ ...t, [field]: e.target.value }));
  const setLine = (key, changes) => setTrip((t) => ({ ...t, lines: t.lines.map((l) => (l.key === key ? { ...l, ...changes } : l)) }));
  const removeLine = (key) => setTrip((t) => ({ ...t, lines: t.lines.filter((l) => l.key !== key) }));

  // Details for one line: its product, options, available stock and any problem to show.
  const describe = (line) => {
    const product = products.data?.find((p) => p._id === line.productId);
    const options = product?.variants?.filter((v) => v.isActive !== false) || [];
    const holder = options.length ? options.find((v) => v._id === line.variantId) : product;
    const available = holder ? unreserved(holder) : null;
    // Several lines for the same option share one pool of stock.
    const requested = trip.lines
      .filter((l) => l.productId === line.productId && (l.variantId || '') === (line.variantId || ''))
      .reduce((s, l) => s + (parseInt(l.quantity, 10) || 0), 0);
    return { product, options, holder, available, over: available !== null && requested > available };
  };

  const described = trip.lines.map((l) => ({ line: l, ...describe(l) }));
  const totalUnits = trip.lines.reduce((s, l) => s + (parseInt(l.quantity, 10) || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!trip.market.trim()) return setError('Enter the market or destination');
    for (const d of described) {
      const qty = parseInt(d.line.quantity, 10);
      if (!d.product) return setError('Choose a product on every line');
      if (d.options.length && !d.line.variantId) return setError(`Choose which option of ${d.product.name} is going`);
      if (!Number.isInteger(qty) || qty < 1) return setError(`Enter a quantity for ${d.product.name}`);
      if (d.over) return setError(`Not enough unreserved stock of ${d.product.name}${d.holder?.label ? ` (${d.holder.label})` : ''}`);
    }
    setBusy(true);
    try {
      const result = await adminService.createMarketTrip({
        market: trip.market,
        tripDate: trip.tripDate,
        responsiblePerson: trip.responsiblePerson,
        vehicle: trip.vehicle,
        notes: trip.notes,
        items: trip.lines.map((l) => ({ productId: l.productId, variantId: l.variantId || undefined, quantity: parseInt(l.quantity, 10) })),
      });
      toast.success(result.message);
      onCreated?.(result.trip);
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
      title="Send stock to market"
      subtitle="Everything listed here is deducted from stock now. You will record what was sold, returned or lost when the trip comes back."
      footer={
        <>
          <span className="trip-form__total">
            Total leaving the farm: <strong>{totalUnits}</strong>
          </span>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="market-trip-form" className="btn btn--primary" disabled={busy}>
            {busy && <span className="spinner" />} Send to market
          </button>
        </>
      }
    >
      <form id="market-trip-form" className="trip-form" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error">{error}</div>}

        <div className="form-grid">
          <FormField label="Market / destination" required>
            <input className="input" value={trip.market} onChange={set('market')} placeholder="e.g. Bodija Market, Ibadan" maxLength={150} />
          </FormField>
          <FormField label="Trip date" required>
            <input className="input" type="date" value={trip.tripDate} onChange={set('tripDate')} />
          </FormField>
          <FormField label="Person responsible">
            <input className="input" value={trip.responsiblePerson} onChange={set('responsiblePerson')} placeholder="Who is selling" maxLength={120} />
          </FormField>
          <FormField label="Vehicle">
            <input className="input" value={trip.vehicle} onChange={set('vehicle')} placeholder="e.g. Farm van, plate number" maxLength={80} />
          </FormField>
        </div>

        <div className="trip-lines">
          <div className="trip-lines__head">
            <span className="field__label">Birds and eggs going out</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setTrip((t) => ({ ...t, lines: [...t.lines, newLine()] }))}>
              <Plus /> Add line
            </button>
          </div>

          {described.map(({ line, product, options, available, over }) => (
            <div key={line.key} className={`trip-line ${over ? 'is-over' : ''}`}>
              <select
                className="select"
                value={line.productId}
                onChange={(e) => setLine(line.key, { productId: e.target.value, variantId: '' })}
                disabled={products.loading}
                aria-label="Product"
              >
                <option value="">{products.loading ? 'Loading…' : 'Select product'}</option>
                {(products.data || []).map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                    {p.category?.name ? ` — ${p.category.name}` : ''}
                  </option>
                ))}
              </select>
              {options.length > 0 ? (
                <select className="select" value={line.variantId} onChange={(e) => setLine(line.key, { variantId: e.target.value })} aria-label="Option">
                  <option value="">Select option</option>
                  {options.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.label} ({unreserved(v)} available)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="trip-line__single">{product ? 'Single option' : '—'}</span>
              )}
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                placeholder="Qty"
                value={line.quantity}
                onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                aria-label="Quantity"
                aria-invalid={over ? 'true' : undefined}
              />
              <span className={`trip-line__avail ${over ? 'is-over' : ''}`}>{available !== null ? `${available} in stock` : ''}</span>
              <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeLine(line.key)} disabled={trip.lines.length === 1} aria-label="Remove line">
                <Trash2 />
              </button>
            </div>
          ))}
          <p className="trip-hint">
            <Info aria-hidden="true" /> Only unreserved stock can go to market. Units held for customers&apos; pending orders stay on the farm.
          </p>
        </div>

        <FormField label="Notes">
          <textarea className="textarea" rows={2} value={trip.notes} onChange={set('notes')} maxLength={1000} />
        </FormField>
      </form>
    </Modal>
  );
}
