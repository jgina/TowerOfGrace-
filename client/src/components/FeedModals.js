import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import useFetch from '../hooks/useFetch';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { FEED_TYPES } from '../utils/constants';
import { formatCurrency } from '../utils/format';
import './NewMarketTripModal.css'; // shared line-item layout
import './FeedModals.css';

const today = () => new Date().toISOString().slice(0, 10);

// Shared submit handling: busy state, error message, success toast.
function useSubmit(onClose, onSaved) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      toast.success(result.message || 'Saved');
      onSaved?.(result);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

const Footer = ({ onClose, busy, formId, label, danger }) => (
  <>
    <button type="button" className="btn btn--ghost" onClick={onClose}>
      Cancel
    </button>
    <button type="submit" form={formId} className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} disabled={busy}>
      {busy && <span className="spinner" />} {label}
    </button>
  </>
);

// ---------- New / edit feed ----------

export function FeedFormModal({ open, onClose, onSaved, feed }) {
  const editing = Boolean(feed);
  const blank = { name: '', brand: '', feedType: 'STARTER', bagSizeKg: 25, lowStockBags: 10, openingBags: '', notes: '', isActive: true };
  const [form, setForm] = useState(blank);
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);

  useEffect(() => {
    if (open) {
      setForm(feed ? { ...blank, ...feed } : blank);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feed]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Enter the feed name');
    const payload = { name: form.name, brand: form.brand, feedType: form.feedType, bagSizeKg: form.bagSizeKg, lowStockBags: form.lowStockBags, notes: form.notes, isActive: form.isActive };
    return run(() => (editing ? adminService.updateFeed(feed._id, payload) : adminService.createFeed({ ...payload, openingBags: form.openingBags })));
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${feed.name}` : 'Add a feed to the store'} footer={<Footer onClose={onClose} busy={busy} formId="feed-form" label={editing ? 'Save' : 'Add feed'} />}>
      <form id="feed-form" className="form-grid" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error span-all">{error}</div>}
        <FormField label="Feed name" required>
          <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Broiler Starter" maxLength={100} />
        </FormField>
        <FormField label="Brand / mill">
          <input className="input" value={form.brand} onChange={set('brand')} maxLength={80} />
        </FormField>
        <FormField label="Type">
          <select className="select" value={form.feedType} onChange={set('feedType')}>
            {Object.entries(FEED_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Bag size (kg)">
          <input className="input" type="number" min="0.1" step="0.5" value={form.bagSizeKg} onChange={set('bagSizeKg')} />
        </FormField>
        <FormField label="Alert when bags fall to" hint="The admin and the boss are alerted at this level">
          <input className="input" type="number" min="0" step="1" value={form.lowStockBags} onChange={set('lowStockBags')} />
        </FormField>
        {!editing && (
          <FormField label="Bags in store now" hint="Opening stock; leave empty if none">
            <input className="input" type="number" min="0" step="0.5" value={form.openingBags} onChange={set('openingBags')} />
          </FormField>
        )}
        <FormField label="Notes" className="span-all">
          <input className="input" value={form.notes} onChange={set('notes')} maxLength={500} />
        </FormField>
        {editing && (
          <label className="switch span-all">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            <span className="switch__track" /> In use (hide feeds you no longer buy)
          </label>
        )}
      </form>
    </Modal>
  );
}

// ---------- Purchase ----------

export function FeedPurchaseModal({ open, onClose, onSaved, feed }) {
  const [form, setForm] = useState({ bags: '', costPerBag: '', supplier: '', date: today(), note: '' });
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);
  useEffect(() => {
    if (open) {
      setForm({ bags: '', costPerBag: feed?.lastCostPerBag ?? '', supplier: '', date: today(), note: '' });
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feed]);
  if (!feed) return null;
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const total = Number(form.bags) * Number(form.costPerBag);
  const submit = (e) => {
    e.preventDefault();
    if (!(Number(form.bags) > 0)) return setError('Enter how many bags were bought');
    return run(() => adminService.recordFeedPurchase(feed._id, form));
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Bags bought · ${feed.name}`}
      subtitle={`${feed.stockBags} bag(s) in store now`}
      footer={<Footer onClose={onClose} busy={busy} formId="purchase-form" label="Add to store" />}
    >
      <form id="purchase-form" className="form-grid" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error span-all">{error}</div>}
        <FormField label="Bags bought" required>
          <input className="input" type="number" min="0.5" step="0.5" value={form.bags} onChange={set('bags')} autoFocus />
        </FormField>
        <FormField label="Cost per bag (₦)">
          <input className="input" type="number" min="0" step="50" value={form.costPerBag} onChange={set('costPerBag')} />
        </FormField>
        <FormField label="Supplier">
          <input className="input" value={form.supplier} onChange={set('supplier')} maxLength={150} />
        </FormField>
        <FormField label="Date">
          <input className="input" type="date" max={today()} value={form.date} onChange={set('date')} />
        </FormField>
        {total > 0 && (
          <p className="feed-total span-all">
            Total cost <strong>{formatCurrency(total)}</strong> · store will have <strong>{Number(feed.stockBags) + Number(form.bags)}</strong> bags
          </p>
        )}
      </form>
    </Modal>
  );
}

// ---------- Stock count correction ----------

export function FeedAdjustModal({ open, onClose, onSaved, feed }) {
  const [form, setForm] = useState({ countedBags: '', note: '', date: today() });
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);
  useEffect(() => {
    if (open) {
      setForm({ countedBags: feed?.stockBags ?? '', note: '', date: today() });
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, feed]);
  if (!feed) return null;
  const diff = Math.round((Number(form.countedBags) - feed.stockBags) * 100) / 100;
  const submit = (e) => {
    e.preventDefault();
    if (form.countedBags === '' || Number(form.countedBags) < 0) return setError('Enter the number of bags counted');
    if (!form.note.trim()) return setError('Give a reason for the correction');
    return run(() => adminService.adjustFeed(feed._id, form));
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Stock count · ${feed.name}`}
      subtitle={`System says ${feed.stockBags} bag(s). Enter what is physically in the store.`}
      footer={<Footer onClose={onClose} busy={busy} formId="adjust-form" label="Save count" />}
    >
      <form id="adjust-form" className="stack" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error">{error}</div>}
        <FormField label="Bags counted" required hint={Number.isFinite(diff) && diff !== 0 ? `${diff > 0 ? '+' : ''}${diff} bag(s) difference` : 'Matches the system'}>
          <input className="input" type="number" min="0" step="0.5" value={form.countedBags} onChange={(e) => setForm({ ...form, countedBags: e.target.value })} autoFocus />
        </FormField>
        <FormField label="Reason" required>
          <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Monthly stock count; damaged bag" maxLength={500} />
        </FormField>
      </form>
    </Modal>
  );
}

// ---------- Daily feeding ----------

/*
  Each line says which feed, how many bags, and who ate it. "Fed to" is one select:
  FARM (every bird), BATCH:<id> (a growing or ready batch), STOCK or STOCK:<id> (birds already
  in the main stock), GROUP (a named pen or group).
*/
const newLine = (target = 'FARM') => ({ key: `${Date.now()}-${Math.random()}`, feedId: '', bags: '', target, groupName: '' });

const toPayloadTarget = (line) => {
  const [fedTo, id] = line.target.split(':');
  return {
    fedTo,
    batchId: fedTo === 'BATCH' ? id : undefined,
    productId: fedTo === 'STOCK' ? id : undefined,
    groupName: fedTo === 'GROUP' ? line.groupName.trim() : undefined,
  };
};

const batchLabel = (b) => `${b.batchCode} · ${b.categoryName} · day ${b.ageDays} · ${b.live} birds`;

export function FeedUsageModal({ open, onClose, onSaved, feeds = [], presetBatchId }) {
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([newLine()]);
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);
  const targets = useFetch(() => (open ? adminService.feedingTargets() : Promise.resolve(null)), [open]);
  const growing = (targets.data?.batches || []).filter((b) => b.status !== 'READY');
  const ready = (targets.data?.batches || []).filter((b) => b.status === 'READY');
  const stock = targets.data?.products || [];

  useEffect(() => {
    if (open) {
      setDate(today());
      setNote('');
      setLines([newLine(presetBatchId ? `BATCH:${presetBatchId}` : 'FARM')]);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetBatchId]);

  const active = feeds.filter((f) => f.isActive !== false);
  const setLine = (key, changes) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  const usedOf = (feedId) => lines.filter((l) => l.feedId === feedId).reduce((s, l) => s + (Number(l.bags) || 0), 0);
  const total = lines.reduce((s, l) => s + (Number(l.bags) || 0), 0);

  const submit = (e) => {
    e.preventDefault();
    for (const l of lines) {
      if (!l.feedId) return setError('Choose the feed on every line');
      if (!(Number(l.bags) > 0)) return setError('Enter the bags used on every line');
      if (l.target === 'GROUP' && !l.groupName.trim()) return setError('Name the pen or group that was fed');
    }
    for (const f of active) {
      if (usedOf(f._id) > f.stockBags) return setError(`Only ${f.stockBags} bag(s) of ${f.name} in store`);
    }
    return run(() =>
      adminService.recordFeedUsage({ date, note, lines: lines.map((l) => ({ feedId: l.feedId, bags: Number(l.bags), ...toPayloadTarget(l) })) })
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Record daily feeding"
      subtitle="Bags given out come off the store. Feed can go to the whole farm, any flock batch (growing or ready for sale), birds in stock, or a named pen."
      footer={
        <>
          <span className="trip-form__total">
            Total today: <strong>{Math.round(total * 100) / 100}</strong> bags
          </span>
          <Footer onClose={onClose} busy={busy} formId="usage-form" label="Record feeding" />
        </>
      }
    >
      <form id="usage-form" className="trip-form" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error">{error}</div>}
        <div className="form-grid">
          <FormField label="Date">
            <input className="input" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Note">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. Morning and evening feeding" />
          </FormField>
        </div>
        <div className="trip-lines">
          <div className="trip-lines__head">
            <span className="field__label">Feed given out</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setLines((all) => [...all, newLine()])}>
              <Plus /> Add line
            </button>
          </div>
          <div className="feed-line feed-line--labels" aria-hidden="true">
            <span>Feed</span>
            <span>Fed to</span>
            <span>Bags</span>
            <span />
          </div>
          {lines.map((line) => {
            const feed = active.find((f) => f._id === line.feedId);
            const over = feed && usedOf(feed._id) > feed.stockBags;
            return (
              <div key={line.key} className={`trip-line feed-line ${over ? 'is-over' : ''}`}>
                <select className="select" value={line.feedId} onChange={(e) => setLine(line.key, { feedId: e.target.value })} aria-label="Feed">
                  <option value="">Select feed</option>
                  {active.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}
                      {f.brand ? ` (${f.brand})` : ''} — {f.stockBags} bags left
                    </option>
                  ))}
                </select>
                <select className="select" value={line.target} onChange={(e) => setLine(line.key, { target: e.target.value })} aria-label="Fed to">
                  <option value="FARM">Whole farm — all birds</option>
                  {growing.length > 0 && (
                    <optgroup label="Flock batches — growing">
                      {growing.map((b) => (
                        <option key={b._id} value={`BATCH:${b._id}`}>
                          {batchLabel(b)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {ready.length > 0 && (
                    <optgroup label="Flock batches — ready for sale">
                      {ready.map((b) => (
                        <option key={b._id} value={`BATCH:${b._id}`}>
                          {batchLabel(b)} · READY
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Birds in main stock">
                    <option value="STOCK">All birds in stock</option>
                    {stock.map((p) => (
                      <option key={p._id} value={`STOCK:${p._id}`}>
                        {p.name} · {p.stock} in stock
                      </option>
                    ))}
                  </optgroup>
                  <option value="GROUP">Other pen / group…</option>
                </select>
                <input
                  className="input"
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder="Bags"
                  value={line.bags}
                  onChange={(e) => setLine(line.key, { bags: e.target.value })}
                  aria-label="Bags used"
                  aria-invalid={over ? 'true' : undefined}
                />
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))} disabled={lines.length === 1} aria-label="Remove line">
                  <Trash2 />
                </button>
                {line.target === 'GROUP' && (
                  <input
                    className="input feed-line__group"
                    value={line.groupName}
                    onChange={(e) => setLine(line.key, { groupName: e.target.value })}
                    placeholder="Name of the pen or group, e.g. Layer house 2, Breeder cocks"
                    maxLength={120}
                    aria-label="Pen or group name"
                  />
                )}
              </div>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
