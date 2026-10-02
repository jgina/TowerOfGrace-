import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Info, Bird, Warehouse, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import useFetch from '../hooks/useFetch';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { MEAT_STORAGE } from '../utils/constants';
import './NewMarketTripModal.css'; // shared line-item layout
import './ProcessingRunModal.css';

const toInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => toInput(new Date());
const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toInput(d);
};
const newLine = () => ({ key: `${Date.now()}-${Math.random()}`, productId: '', variantId: '', quantity: '', weightKg: '' });
const blank = (batchId) => ({
  sourceType: batchId ? 'BATCH' : 'STOCK',
  batchId: batchId || '',
  stockLine: '',
  processedOn: today(),
  birdsIn: '',
  condemned: '',
  liveWeightKg: '',
  dressedWeightKg: '',
  storage: 'CHILLED',
  useBy: addDays(today(), MEAT_STORAGE.CHILLED.days),
  useByTouched: false,
  processingCost: '',
  notes: '',
  lines: [newLine()],
});
const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/**
 * Records a meat processing run: live birds in (from a ready flock batch or from live-bird stock),
 * prepared meat out (into Prepared Meat products). Saving changes stock immediately.
 */
export default function ProcessingRunModal({ open, onClose, onCreated, presetBatchId }) {
  const toast = useToast();
  const [form, setForm] = useState(() => blank(presetBatchId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const options = useFetch(() => (open ? adminService.processingOptions() : Promise.resolve(null)), [open]);

  useEffect(() => {
    if (open) {
      setForm(blank(presetBatchId));
      setError('');
    }
  }, [open, presetBatchId]);

  const batches = options.data?.batches || [];
  const birdStock = options.data?.birdStock || [];
  const meatProducts = options.data?.meatProducts || [];
  const set = (changes) => setForm((f) => ({ ...f, ...changes }));
  const field = (name) => (e) => set({ [name]: e.target.value });
  const setLine = (key, changes) => setForm((f) => ({ ...f, lines: f.lines.map((l) => (l.key === key ? { ...l, ...changes } : l)) }));

  // Use-by follows the date and storage until the admin sets it by hand.
  const setStorage = (storage) => setForm((f) => ({ ...f, storage, useBy: f.useByTouched ? f.useBy : addDays(f.processedOn, MEAT_STORAGE[storage].days) }));
  const setDate = (processedOn) => setForm((f) => ({ ...f, processedOn, useBy: f.useByTouched ? f.useBy : addDays(processedOn, MEAT_STORAGE[f.storage].days) }));

  const batch = batches.find((b) => b._id === form.batchId);
  const source = birdStock.find((l) => `${l.productId}:${l.variantId || ''}` === form.stockLine);
  const available = form.sourceType === 'BATCH' ? batch?.live ?? null : source?.available ?? null;
  const birdsIn = parseInt(form.birdsIn, 10) || 0;
  const condemned = parseInt(form.condemned, 10) || 0;
  const unitsOut = form.lines.reduce((s, l) => s + (parseInt(l.quantity, 10) || 0), 0);
  const linesKg = form.lines.reduce((s, l) => s + (Number(l.weightKg) || 0), 0);
  const dressedKg = num(form.dressedWeightKg) ?? (linesKg || null);
  const liveKg = num(form.liveWeightKg);
  const yieldPct = liveKg && dressedKg ? Math.round((dressedKg / liveKg) * 1000) / 10 : null;
  const estLiveKg = form.sourceType === 'BATCH' && batch?.latestWeightKg && birdsIn ? Math.round(batch.latestWeightKg * birdsIn * 10) / 10 : null;

  const describe = (line) => {
    const product = meatProducts.find((p) => p._id === line.productId);
    return { product, variants: product?.variants || [] };
  };

  const sourceProblem = useMemo(() => {
    if (form.sourceType === 'BATCH') {
      if (!batch) return null;
      if (!batch.ready) return `${batch.batchCode} is still growing — ${batch.daysToReady} day(s) to go.`;
    }
    if (available !== null && birdsIn > available) return `Only ${available} bird(s) available from this source.`;
    return null;
  }, [form.sourceType, batch, available, birdsIn]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.sourceType === 'BATCH' && !batch) return setError('Choose the flock batch the birds came from');
    if (form.sourceType === 'STOCK' && !source) return setError('Choose the birds taken from stock');
    if (birdsIn < 1) return setError('Enter how many birds were processed');
    if (condemned > birdsIn) return setError('Condemned birds cannot be more than the birds processed');
    if (sourceProblem) return setError(sourceProblem);
    for (const line of form.lines) {
      const { product, variants } = describe(line);
      if (!product) return setError('Choose the meat product on every line');
      if (variants.length && !line.variantId) return setError(`Choose which option of ${product.name} was produced`);
      if (!(parseInt(line.quantity, 10) >= 1)) return setError(`Enter the quantity of ${product.name} produced`);
    }
    setBusy(true);
    try {
      const result = await adminService.createProcessingRun({
        sourceType: form.sourceType,
        batchId: form.sourceType === 'BATCH' ? form.batchId : undefined,
        productId: form.sourceType === 'STOCK' ? source.productId : undefined,
        variantId: form.sourceType === 'STOCK' ? source.variantId || undefined : undefined,
        processedOn: form.processedOn,
        birdsIn,
        condemned,
        liveWeightKg: num(form.liveWeightKg) ?? undefined,
        dressedWeightKg: num(form.dressedWeightKg) ?? undefined,
        storage: form.storage,
        useBy: form.useBy,
        processingCost: num(form.processingCost) ?? undefined,
        notes: form.notes,
        outputs: form.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId || undefined,
          quantity: parseInt(l.quantity, 10),
          weightKg: num(l.weightKg) ?? undefined,
        })),
      });
      toast.success(result.message);
      onCreated?.(result.run);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const noMeatProducts = options.data && meatProducts.length === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="New processing run"
      subtitle="Live birds go in, prepared meat comes out. Saving takes the birds from their source and adds the meat to stock straight away."
      footer={
        <>
          <span className="trip-form__total">
            <strong>{birdsIn}</strong> bird{birdsIn === 1 ? '' : 's'} → <strong>{unitsOut}</strong> unit{unitsOut === 1 ? '' : 's'}
            {yieldPct !== null && <> · yield <strong>{yieldPct}%</strong></>}
          </span>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="processing-form" className="btn btn--primary" disabled={busy || noMeatProducts}>
            {busy && <span className="spinner" />} Save run
          </button>
        </>
      }
    >
      <form id="processing-form" className="trip-form proc-form" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error">{error}</div>}
        {noMeatProducts && (
          <div className="form-alert form-alert--warning">
            There are no Prepared Meat products yet. Create one (for example “Whole Dressed Chicken”) in the Prepared Meat category first.{' '}
            <Link to="/admin/products/new" className="link" onClick={onClose}>
              Add a product <ArrowRight />
            </Link>
          </div>
        )}

        {/* ---------- 1. Birds in ---------- */}
        <fieldset className="proc-step">
          <legend>
            <span>1</span> Birds in
          </legend>
          <div className="proc-source" role="radiogroup" aria-label="Where the birds came from">
            {[
              { value: 'BATCH', icon: Bird, title: 'From a flock batch', text: 'Birds straight from a batch that is ready' },
              { value: 'STOCK', icon: Warehouse, title: 'From live-bird stock', text: 'Birds already in the shop inventory' },
            ].map(({ value, icon: Icon, title, text }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={form.sourceType === value}
                className={`proc-source__option ${form.sourceType === value ? 'is-active' : ''}`}
                onClick={() => set({ sourceType: value })}
              >
                <Icon aria-hidden="true" />
                <strong>{title}</strong>
                <small>{text}</small>
              </button>
            ))}
          </div>

          <div className="form-grid">
            {form.sourceType === 'BATCH' ? (
              <FormField label="Flock batch" required className="span-all">
                <select className="select" value={form.batchId} onChange={field('batchId')} disabled={options.loading}>
                  <option value="">{options.loading ? 'Loading…' : 'Select a batch'}</option>
                  {batches.map((b) => (
                    <option key={b._id} value={b._id} disabled={!b.ready || b.live < 1}>
                      {b.batchCode} · {b.categoryName} · {b.live} live · day {b.ageDays}
                      {b.ready ? ' · READY' : ` · ${b.daysToReady} day(s) to go`}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : (
              <FormField label="Birds taken from stock" required className="span-all">
                <select className="select" value={form.stockLine} onChange={field('stockLine')} disabled={options.loading}>
                  <option value="">{options.loading ? 'Loading…' : 'Select product / option'}</option>
                  {birdStock.map((l) => (
                    <option key={`${l.productId}:${l.variantId || ''}`} value={`${l.productId}:${l.variantId || ''}`} disabled={l.available < 1}>
                      {l.productName}
                      {l.variantLabel ? ` (${l.variantLabel})` : ''} · {l.available} available
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <FormField label="Birds processed" required hint={available !== null ? `${available} available` : undefined} error={sourceProblem || undefined}>
              <input className="input" type="number" min="1" step="1" value={form.birdsIn} onChange={field('birdsIn')} />
            </FormField>
            <FormField label="Condemned (rejected)" hint="Birds found unfit during processing">
              <input className="input" type="number" min="0" step="1" value={form.condemned} onChange={field('condemned')} />
            </FormField>
          </div>
        </fieldset>

        {/* ---------- 2. Weights ---------- */}
        <fieldset className="proc-step">
          <legend>
            <span>2</span> Weights <small>(optional — used for the dressing yield)</small>
          </legend>
          <div className="form-grid">
            <FormField label="Total live weight (kg)" hint={estLiveKg ? `Estimate from the batch's last weigh-in: about ${estLiveKg} kg` : undefined}>
              <input className="input" type="number" min="0" step="0.1" value={form.liveWeightKg} onChange={field('liveWeightKg')} />
            </FormField>
            <FormField label="Total dressed weight (kg)" hint={linesKg && !form.dressedWeightKg ? `Lines below add up to ${Math.round(linesKg * 100) / 100} kg` : undefined}>
              <input className="input" type="number" min="0" step="0.1" value={form.dressedWeightKg} onChange={field('dressedWeightKg')} />
            </FormField>
          </div>
          {yieldPct !== null && (
            <p className={`proc-yield ${yieldPct < 60 || yieldPct > 85 ? 'is-odd' : ''}`}>
              Dressing yield <strong>{yieldPct}%</strong>
              <small>{yieldPct < 60 || yieldPct > 85 ? 'Unusual — broilers typically dress at about 70–75%. Check the weights.' : 'Typical for broilers is about 70–75%.'}</small>
            </p>
          )}
        </fieldset>

        {/* ---------- 3. Prepared meat out ---------- */}
        <fieldset className="proc-step">
          <legend>
            <span>3</span> Prepared meat produced
          </legend>
          <div className="trip-lines">
            <div className="trip-lines__head">
              <span className="field__label">Added to stock</span>
              <button type="button" className="btn btn--outline btn--sm" onClick={() => set({ lines: [...form.lines, newLine()] })}>
                <Plus /> Add line
              </button>
            </div>
            {form.lines.map((line) => {
              const { product, variants } = describe(line);
              return (
                <div key={line.key} className="trip-line proc-line">
                  <select className="select" value={line.productId} onChange={(e) => setLine(line.key, { productId: e.target.value, variantId: '' })} aria-label="Meat product">
                    <option value="">Select meat product</option>
                    {meatProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                        {p.isActive === false ? ' (hidden from shop)' : ''}
                      </option>
                    ))}
                  </select>
                  {variants.length > 0 ? (
                    <select className="select" value={line.variantId} onChange={(e) => setLine(line.key, { variantId: e.target.value })} aria-label="Option">
                      <option value="">Select option</option>
                      {variants.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.label} ({v.stock} in stock)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="trip-line__single">{product ? `${product.stock ?? 0} in stock` : '—'}</span>
                  )}
                  <input className="input" type="number" min="1" step="1" placeholder="Qty" value={line.quantity} onChange={(e) => setLine(line.key, { quantity: e.target.value })} aria-label="Quantity" />
                  <input className="input" type="number" min="0" step="0.1" placeholder="kg" value={line.weightKg} onChange={(e) => setLine(line.key, { weightKg: e.target.value })} aria-label="Weight in kg" />
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => set({ lines: form.lines.filter((l) => l.key !== line.key) })} disabled={form.lines.length === 1} aria-label="Remove line">
                    <Trash2 />
                  </button>
                </div>
              );
            })}
            <p className="trip-hint">
              <Info aria-hidden="true" /> Quantity is what goes into stock — whole birds, packs or pieces, matching how the product is sold. Weight is optional.
            </p>
          </div>
        </fieldset>

        {/* ---------- 4. Storage ---------- */}
        <fieldset className="proc-step">
          <legend>
            <span>4</span> Storage & use-by
          </legend>
          <div className="proc-storage" role="radiogroup" aria-label="Storage">
            {Object.entries(MEAT_STORAGE).map(([key, s]) => (
              <button key={key} type="button" role="radio" aria-checked={form.storage === key} className={`proc-storage__option ${form.storage === key ? 'is-active' : ''}`} onClick={() => setStorage(key)}>
                <strong>{s.label}</strong>
                <small>{s.hint}</small>
              </button>
            ))}
          </div>
          <div className="form-grid">
            <FormField label="Processing date" required>
              <input className="input" type="date" max={today()} value={form.processedOn} onChange={(e) => setDate(e.target.value)} />
            </FormField>
            <FormField label="Use by" hint="You will be alerted the day before">
              <input className="input" type="date" min={form.processedOn} value={form.useBy} onChange={(e) => set({ useBy: e.target.value, useByTouched: true })} />
            </FormField>
            <FormField label="Processing cost (₦)" hint="Labour, packaging, fuel — optional">
              <input className="input" type="number" min="0" step="1" value={form.processingCost} onChange={field('processingCost')} />
            </FormField>
            <FormField label="Notes">
              <input className="input" value={form.notes} onChange={field('notes')} maxLength={1000} placeholder="e.g. Processed for weekend orders" />
            </FormField>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
