import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from './Modal';
import FormField from './FormField';
import useFetch from '../hooks/useFetch';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { MEDICINE_CATEGORIES, MEDICINE_UNITS, TREATMENT_PURPOSES, TREATMENT_ROUTES, DISPOSAL_REASONS, unitShort } from '../utils/constants';
import { formatCurrency, formatDate, toDateInput } from '../utils/format';
import './NewMarketTripModal.css'; // shared line-item layout
import './FeedModals.css';
import './MedicineModals.css';

const today = () => new Date().toISOString().slice(0, 10);
const round2 = (n) => Math.round(n * 100) / 100;

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

// ---------- New / edit medicine ----------

export function MedicineFormModal({ open, onClose, onSaved, medicine }) {
  const editing = Boolean(medicine);
  const blank = {
    name: '',
    brand: '',
    category: 'VACCINE',
    unit: 'BOTTLE',
    unitSize: '',
    activeIngredient: '',
    lowStockUnits: 2,
    withdrawalDays: 0,
    expiryDate: '',
    storage: '',
    openingUnits: '',
    notes: '',
    isActive: true,
  };
  const [form, setForm] = useState(blank);
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);

  useEffect(() => {
    if (open) {
      setForm(medicine ? { ...blank, ...medicine, expiryDate: toDateInput(medicine.expiryDate) } : blank);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, medicine]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Enter the medicine name');
    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      unit: form.unit,
      unitSize: form.unitSize,
      activeIngredient: form.activeIngredient,
      lowStockUnits: form.lowStockUnits,
      withdrawalDays: form.withdrawalDays || 0,
      expiryDate: form.expiryDate,
      storage: form.storage,
      notes: form.notes,
      isActive: form.isActive,
    };
    return run(() => (editing ? adminService.updateMedicine(medicine._id, payload) : adminService.createMedicine({ ...payload, openingUnits: form.openingUnits })));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${medicine.name}` : 'Add a medicine to the store'}
      subtitle="Vaccines, antibiotics, vitamins, dewormers, disinfectants — anything given to the birds."
      footer={<Footer onClose={onClose} busy={busy} formId="medicine-form" label={editing ? 'Save' : 'Add medicine'} />}
    >
      <form id="medicine-form" className="form-grid" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error span-all">{error}</div>}
        <FormField label="Medicine name" required>
          <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Gumboro vaccine, Amoxicillin 20%" maxLength={100} />
        </FormField>
        <FormField label="Brand / manufacturer">
          <input className="input" value={form.brand} onChange={set('brand')} maxLength={80} />
        </FormField>
        <FormField label="Type">
          <select className="select" value={form.category} onChange={set('category')}>
            {Object.entries(MEDICINE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Active ingredient">
          <input className="input" value={form.activeIngredient} onChange={set('activeIngredient')} placeholder="e.g. Amoxicillin trihydrate" maxLength={150} />
        </FormField>
        <FormField label="Counted in" hint="How the store counts it">
          <select className="select" value={form.unit} onChange={set('unit')}>
            {Object.entries(MEDICINE_UNITS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Each unit holds" hint="e.g. 100 g, 1000 doses, 500 ml">
          <input className="input" value={form.unitSize} onChange={set('unitSize')} maxLength={60} />
        </FormField>
        <FormField label="Alert when stock falls to" hint="The admin and the boss are alerted at this level">
          <input className="input" type="number" min="0" step="1" value={form.lowStockUnits} onChange={set('lowStockUnits')} />
        </FormField>
        <FormField label="Withdrawal period (days)" hint="Days after the last dose before birds can be sold or slaughtered. 0 if none.">
          <input className="input" type="number" min="0" max="365" step="1" value={form.withdrawalDays} onChange={set('withdrawalDays')} />
        </FormField>
        {!editing && (
          <FormField label="Quantity in store now" hint="Opening stock; leave empty if none">
            <input className="input" type="number" min="0" step="0.5" value={form.openingUnits} onChange={set('openingUnits')} />
          </FormField>
        )}
        <FormField label="Expiry date" hint={editing ? 'Earliest expiry of the stock on hand' : 'Of the stock on hand, if any'}>
          <input className="input" type="date" value={form.expiryDate} onChange={set('expiryDate')} />
        </FormField>
        <FormField label="Storage" className="span-all">
          <input className="input" value={form.storage} onChange={set('storage')} placeholder="e.g. Refrigerate at 2–8 °C, keep out of sunlight" maxLength={150} />
        </FormField>
        <FormField label="Notes" className="span-all">
          <input className="input" value={form.notes} onChange={set('notes')} maxLength={500} />
        </FormField>
        {editing && (
          <label className="switch span-all">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            <span className="switch__track" /> In use (hide medicines you no longer keep)
          </label>
        )}
      </form>
    </Modal>
  );
}

// ---------- Purchase ----------

export function MedicinePurchaseModal({ open, onClose, onSaved, medicine }) {
  const blank = { quantity: '', costPerUnit: '', supplier: '', lotNumber: '', expiryDate: '', date: today(), note: '' };
  const [form, setForm] = useState(blank);
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);
  useEffect(() => {
    if (open) {
      setForm({ ...blank, costPerUnit: medicine?.lastCostPerUnit ?? '' });
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, medicine]);
  if (!medicine) return null;
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const u = unitShort(medicine.unit);
  const total = Number(form.quantity) * Number(form.costPerUnit);
  const submit = (e) => {
    e.preventDefault();
    if (!(Number(form.quantity) > 0)) return setError('Enter how much was bought');
    if (form.expiryDate && form.expiryDate < today()) return setError('This lot has already expired — check the expiry date');
    return run(() => adminService.recordMedicinePurchase(medicine._id, form));
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Bought · ${medicine.name}`}
      subtitle={`${medicine.stockUnits} ${u} in store now`}
      footer={<Footer onClose={onClose} busy={busy} formId="medicine-purchase-form" label="Add to store" />}
    >
      <form id="medicine-purchase-form" className="form-grid" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error span-all">{error}</div>}
        <FormField label={`Quantity bought (${u})`} required>
          <input className="input" type="number" min="0.5" step="0.5" value={form.quantity} onChange={set('quantity')} autoFocus />
        </FormField>
        <FormField label="Cost per unit (₦)">
          <input className="input" type="number" min="0" step="50" value={form.costPerUnit} onChange={set('costPerUnit')} />
        </FormField>
        <FormField label="Supplier / vet shop">
          <input className="input" value={form.supplier} onChange={set('supplier')} maxLength={150} />
        </FormField>
        <FormField label="Date bought">
          <input className="input" type="date" max={today()} value={form.date} onChange={set('date')} />
        </FormField>
        <FormField label="Lot / batch no.">
          <input className="input" value={form.lotNumber} onChange={set('lotNumber')} maxLength={60} />
        </FormField>
        <FormField label="Expiry date" hint="From the label">
          <input className="input" type="date" min={today()} value={form.expiryDate} onChange={set('expiryDate')} />
        </FormField>
        {total > 0 && (
          <p className="feed-total span-all">
            Total cost <strong>{formatCurrency(total)}</strong> · store will have <strong>{round2(Number(medicine.stockUnits) + Number(form.quantity))}</strong> {u}
          </p>
        )}
      </form>
    </Modal>
  );
}

// ---------- Stock count correction ----------

export function MedicineAdjustModal({ open, onClose, onSaved, medicine }) {
  const [form, setForm] = useState({ countedUnits: '', note: '', date: today() });
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);
  useEffect(() => {
    if (open) {
      setForm({ countedUnits: medicine?.stockUnits ?? '', note: '', date: today() });
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, medicine]);
  if (!medicine) return null;
  const u = unitShort(medicine.unit);
  const diff = round2(Number(form.countedUnits) - medicine.stockUnits);
  const submit = (e) => {
    e.preventDefault();
    if (form.countedUnits === '' || Number(form.countedUnits) < 0) return setError('Enter the quantity counted');
    if (!form.note.trim()) return setError('Give a reason for the correction');
    return run(() => adminService.adjustMedicine(medicine._id, form));
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Stock count · ${medicine.name}`}
      subtitle={`System says ${medicine.stockUnits} ${u}. Enter what is physically in the store.`}
      footer={<Footer onClose={onClose} busy={busy} formId="medicine-adjust-form" label="Save count" />}
    >
      <form id="medicine-adjust-form" className="stack" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error">{error}</div>}
        <FormField label={`Counted (${u})`} required hint={Number.isFinite(diff) && diff !== 0 ? `${diff > 0 ? '+' : ''}${diff} ${u} difference` : 'Matches the system'}>
          <input className="input" type="number" min="0" step="0.5" value={form.countedUnits} onChange={(e) => setForm({ ...form, countedUnits: e.target.value })} autoFocus />
        </FormField>
        <FormField label="Reason" required>
          <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Monthly stock count" maxLength={500} />
        </FormField>
      </form>
    </Modal>
  );
}

// ---------- Disposal (expired, damaged, spoiled) ----------

export function MedicineDisposeModal({ open, onClose, onSaved, medicine }) {
  const blank = { quantity: '', reason: 'EXPIRED', nextExpiryDate: '', note: '', date: today() };
  const [form, setForm] = useState(blank);
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);
  useEffect(() => {
    if (open) {
      setForm({ ...blank, quantity: medicine?.isExpired ? medicine.stockUnits : '', reason: medicine?.isExpired || medicine?.isExpiringSoon ? 'EXPIRED' : 'DAMAGED' });
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, medicine]);
  if (!medicine) return null;
  const u = unitShort(medicine.unit);
  const left = round2(medicine.stockUnits - (Number(form.quantity) || 0));
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    if (!(Number(form.quantity) > 0)) return setError('Enter how much was thrown away');
    if (Number(form.quantity) > medicine.stockUnits) return setError(`Only ${medicine.stockUnits} ${u} in store`);
    return run(() => adminService.disposeMedicine(medicine._id, form));
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Dispose · ${medicine.name}`}
      subtitle={`${medicine.stockUnits} ${u} in store${medicine.expiryDate ? ` · expiry ${formatDate(medicine.expiryDate)}` : ''}`}
      footer={<Footer onClose={onClose} busy={busy} formId="medicine-dispose-form" label="Record disposal" danger />}
    >
      <form id="medicine-dispose-form" className="form-grid" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error span-all">{error}</div>}
        <FormField label={`Quantity thrown away (${u})`} required>
          <input className="input" type="number" min="0.5" step="0.5" max={medicine.stockUnits} value={form.quantity} onChange={set('quantity')} autoFocus />
        </FormField>
        <FormField label="Reason">
          <select className="select" value={form.reason} onChange={set('reason')}>
            {Object.entries(DISPOSAL_REASONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FormField>
        {left > 0 && (
          <FormField label="Expiry of what remains" hint="Leave empty to keep the current date" className="span-all">
            <input className="input" type="date" value={form.nextExpiryDate} onChange={set('nextExpiryDate')} />
          </FormField>
        )}
        <FormField label="Note" className="span-all">
          <input className="input" value={form.note} onChange={set('note')} placeholder="e.g. Buried in the disposal pit" maxLength={500} />
        </FormField>
      </form>
    </Modal>
  );
}

// ---------- Treatment (vaccination, medication, supplements) ----------

const newLine = () => ({ key: `${Date.now()}-${Math.random()}`, medicineId: '', quantity: '', dosage: '', withdrawalDays: '' });
const batchLabel = (b) => `${b.batchCode} · ${b.categoryName} · day ${b.ageDays} · ${b.live} birds`;
const blankTreatment = (target = 'FARM') => ({
  date: today(),
  target,
  groupName: '',
  purpose: 'VACCINATION',
  route: 'DRINKING_WATER',
  condition: '',
  birdsTreated: '',
  durationDays: 1,
  administeredBy: '',
  note: '',
});

/*
  One treatment = one group of birds given one or more medicines. "Treated" is one select, like feeding:
  FARM, BATCH:<id>, STOCK or STOCK:<id>, GROUP (a named pen). Each line's withdrawal period starts from
  the medicine's default and can be changed for this treatment.
*/
export function TreatmentModal({ open, onClose, onSaved, medicines = [], presetBatchId }) {
  const [form, setForm] = useState(blankTreatment());
  const [lines, setLines] = useState([newLine()]);
  // Pre-fill the number of birds from the chosen batch, until the admin types their own figure.
  const [fromBatch, setFromBatch] = useState(true);
  const { busy, error, setError, run } = useSubmit(onClose, onSaved);
  const targets = useFetch(() => (open ? adminService.feedingTargets() : Promise.resolve(null)), [open]);
  const batches = targets.data?.batches || [];
  const growing = batches.filter((b) => b.status !== 'READY');
  const ready = batches.filter((b) => b.status === 'READY');
  const stock = targets.data?.products || [];

  useEffect(() => {
    if (open) {
      setForm(blankTreatment(presetBatchId ? `BATCH:${presetBatchId}` : 'FARM'));
      setLines([newLine()]);
      setFromBatch(true);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetBatchId]);

  useEffect(() => {
    const [kind, id] = form.target.split(':');
    const batch = kind === 'BATCH' ? batches.find((b) => b._id === id) : null;
    if (fromBatch) setForm((f) => ({ ...f, birdsTreated: batch ? batch.live : '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.target, targets.data]);

  const active = medicines.filter((m) => m.isActive !== false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setLine = (key, changes) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  const usedOf = (id) => lines.filter((l) => l.medicineId === id).reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  const withdrawalOf = (l) => {
    if (l.withdrawalDays !== '') return Number(l.withdrawalDays) || 0;
    return active.find((m) => m._id === l.medicineId)?.withdrawalDays || 0;
  };

  // Last dose day + the longest withdrawal period among the medicines.
  const longest = Math.max(0, ...lines.filter((l) => l.medicineId).map(withdrawalOf));
  let withdrawalUntil = null;
  if (longest > 0 && form.date) {
    withdrawalUntil = new Date(form.date);
    withdrawalUntil.setDate(withdrawalUntil.getDate() + (Number(form.durationDays) || 1) - 1 + longest);
  }

  const submit = (e) => {
    e.preventDefault();
    const [givenTo, id] = form.target.split(':');
    if (givenTo === 'GROUP' && !form.groupName.trim()) return setError('Name the pen or group that was treated');
    for (const l of lines) {
      if (!l.medicineId) return setError('Choose the medicine on every line');
      if (!(Number(l.quantity) > 0)) return setError('Enter the quantity used on every line');
    }
    for (const m of active) {
      if (usedOf(m._id) > m.stockUnits) return setError(`Only ${m.stockUnits} ${unitShort(m.unit)} of ${m.name} in store`);
      if (usedOf(m._id) > 0 && m.isExpired) return setError(`${m.name} has expired — do not use it`);
    }
    return run(() =>
      adminService.recordTreatment({
        date: form.date,
        givenTo,
        batchId: givenTo === 'BATCH' ? id : undefined,
        productId: givenTo === 'STOCK' ? id : undefined,
        groupName: givenTo === 'GROUP' ? form.groupName.trim() : undefined,
        purpose: form.purpose,
        route: form.route,
        condition: form.condition,
        birdsTreated: form.birdsTreated,
        durationDays: form.durationDays,
        administeredBy: form.administeredBy,
        note: form.note,
        lines: lines.map((l) => ({ medicineId: l.medicineId, quantity: Number(l.quantity), dosage: l.dosage, withdrawalDays: l.withdrawalDays === '' ? undefined : Number(l.withdrawalDays) })),
      })
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Record a treatment"
      subtitle="Vaccinations, medication, vitamins and dewormers. What is used comes off the medicine store, and birds on a withdrawal period are flagged until it ends."
      footer={
        <>
          <span className="trip-form__total">
            {withdrawalUntil ? (
              <>
                Do not sell before <strong>{formatDate(withdrawalUntil)}</strong>
              </>
            ) : (
              'No withdrawal period'
            )}
          </span>
          <Footer onClose={onClose} busy={busy} formId="treatment-form" label="Record treatment" />
        </>
      }
    >
      <form id="treatment-form" className="trip-form" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error">{error}</div>}
        <div className="form-grid">
          <FormField label="Birds treated" required className="span-all">
            <select className="select" value={form.target} onChange={(e) => { setFromBatch(true); setForm((f) => ({ ...f, target: e.target.value })); }}>
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
          </FormField>
          {form.target === 'GROUP' && (
            <FormField label="Pen or group name" required className="span-all">
              <input className="input" value={form.groupName} onChange={set('groupName')} placeholder="e.g. Layer house 2, Breeder cocks" maxLength={120} />
            </FormField>
          )}
          <FormField label="Purpose">
            <select className="select" value={form.purpose} onChange={set('purpose')}>
              {Object.entries(TREATMENT_PURPOSES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={form.purpose === 'VACCINATION' ? 'Against (disease)' : 'Disease / reason'}>
            <input className="input" value={form.condition} onChange={set('condition')} placeholder={form.purpose === 'VACCINATION' ? 'e.g. Gumboro, Newcastle (Lasota)' : 'e.g. CRD, coccidiosis, heat stress'} maxLength={150} />
          </FormField>
          <FormField label="How it was given">
            <select className="select" value={form.route} onChange={set('route')}>
              {Object.entries(TREATMENT_ROUTES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Number of birds">
            <input className="input" type="number" min="0" step="1" value={form.birdsTreated} onChange={(e) => { setFromBatch(false); set('birdsTreated')(e); }} />
          </FormField>
          <FormField label="Date (first dose)">
            <input className="input" type="date" max={today()} value={form.date} onChange={set('date')} />
          </FormField>
          <FormField label="Days of treatment" hint="1 for a single dose or vaccination">
            <input className="input" type="number" min="1" max="60" step="1" value={form.durationDays} onChange={set('durationDays')} />
          </FormField>
          <FormField label="Given by" hint="Leave empty to use your name">
            <input className="input" value={form.administeredBy} onChange={set('administeredBy')} placeholder="e.g. Dr. Okafor (vet), farm attendant" maxLength={120} />
          </FormField>
          <FormField label="Note">
            <input className="input" value={form.note} onChange={set('note')} maxLength={500} placeholder="e.g. Birds showed improvement by day 3" />
          </FormField>
        </div>

        <div className="trip-lines">
          <div className="trip-lines__head">
            <span className="field__label">Medicines used</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setLines((all) => [...all, newLine()])}>
              <Plus /> Add medicine
            </button>
          </div>
          <div className="medicine-line medicine-line--labels" aria-hidden="true">
            <span>Medicine</span>
            <span>Quantity</span>
            <span>Dosage</span>
            <span>Withdrawal</span>
            <span />
          </div>
          {lines.map((line) => {
            const medicine = active.find((m) => m._id === line.medicineId);
            const over = medicine && usedOf(medicine._id) > medicine.stockUnits;
            return (
              <div key={line.key} className={`trip-line medicine-line ${over || medicine?.isExpired ? 'is-over' : ''}`}>
                <select className="select" value={line.medicineId} onChange={(e) => setLine(line.key, { medicineId: e.target.value, withdrawalDays: '' })} aria-label="Medicine">
                  <option value="">Select medicine</option>
                  {active.map((m) => (
                    <option key={m._id} value={m._id} disabled={m.stockUnits <= 0 || m.isExpired}>
                      {m.name}
                      {m.brand ? ` (${m.brand})` : ''} — {m.isExpired ? 'EXPIRED' : `${m.stockUnits} ${unitShort(m.unit)} left`}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder={medicine ? unitShort(medicine.unit) : 'Qty'}
                  value={line.quantity}
                  onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                  aria-label="Quantity used"
                  aria-invalid={over ? 'true' : undefined}
                />
                <input className="input" value={line.dosage} onChange={(e) => setLine(line.key, { dosage: e.target.value })} placeholder="e.g. 1 g per 2 L water" maxLength={150} aria-label="Dosage" />
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="365"
                  step="1"
                  placeholder={medicine ? `${medicine.withdrawalDays || 0} days` : 'Days'}
                  value={line.withdrawalDays}
                  onChange={(e) => setLine(line.key, { withdrawalDays: e.target.value })}
                  aria-label="Withdrawal period in days"
                  title="Withdrawal period in days (defaults to the medicine's own)"
                />
                <button type="button" className="icon-btn icon-btn--danger" onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))} disabled={lines.length === 1} aria-label="Remove medicine">
                  <Trash2 />
                </button>
              </div>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
