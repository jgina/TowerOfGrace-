import { useEffect, useState } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import useFetch from '../hooks/useFetch';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { TYPICAL_TARGET_DAYS, isLiveBirds } from '../utils/constants';
import { formatDate, toDateInput } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

const blank = () => ({
  category: '',
  batchCode: '',
  breed: '',
  supplier: '',
  house: '',
  purchaseDate: today(),
  ageAtPurchaseDays: 1,
  quantityPurchased: '',
  unitCost: '',
  targetAgeDays: '',
  targetWeightKg: '',
  notes: '',
});

/** Create a new flock batch, or edit an existing one (pass `batch`). */
export default function BatchFormModal({ open, onClose, onSaved, batch }) {
  const toast = useToast();
  const editing = Boolean(batch);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const categories = useFetch(() => (open ? adminService.listCategories() : Promise.resolve([])), [open]);
  const birdCategories = (categories.data || []).filter((c) => isLiveBirds(c.slug));

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      batch
        ? {
            ...blank(),
            ...Object.fromEntries(Object.keys(blank()).map((k) => [k, batch[k] ?? ''])),
            category: batch.category,
            purchaseDate: toDateInput(batch.purchaseDate),
          }
        : blank()
    );
  }, [open, batch]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const chooseCategory = (e) => {
    const category = birdCategories.find((c) => c._id === e.target.value);
    setForm((f) => ({ ...f, category: e.target.value, targetAgeDays: f.targetAgeDays || TYPICAL_TARGET_DAYS[category?.slug] || '' }));
  };

  // Live preview of the batch's age and ready date as the form is filled in.
  const arrival = form.purchaseDate ? new Date(form.purchaseDate) : null;
  const ageNow = arrival ? Number(form.ageAtPurchaseDays || 1) + Math.max(Math.floor((Date.now() - arrival.getTime()) / DAY_MS), 0) : null;
  const readyDate =
    arrival && form.targetAgeDays ? new Date(arrival.getTime() + (Number(form.targetAgeDays) - Number(form.ageAtPurchaseDays || 1)) * DAY_MS) : null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!editing && !form.category) return setError('Choose the type of bird');
    if (!(Number(form.quantityPurchased) >= 1)) return setError('Enter how many birds arrived');
    if (!(Number(form.targetAgeDays) >= 1)) return setError('Enter the age (in days) the birds are sold at');
    setBusy(true);
    try {
      const payload = { ...form };
      if (editing) {
        delete payload.category;
        delete payload.batchCode;
      }
      const result = editing ? await adminService.updateBatch(batch._id, payload) : await adminService.createBatch(payload);
      toast.success(result.message || 'Batch saved');
      onSaved?.(result.batch);
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
      title={editing ? `Edit ${batch.batchCode}` : 'New flock batch'}
      subtitle={editing ? 'Changes to dates or target age update the stage straight away.' : 'Record a delivery of chicks or birds. Growing birds are tracked here and are not added to shop stock until you confirm they are ready.'}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="batch-form" className="btn btn--primary" disabled={busy}>
            {busy && <span className="spinner" />} {editing ? 'Save changes' : 'Create batch'}
          </button>
        </>
      }
    >
      <form id="batch-form" className="form-grid" onSubmit={submit} noValidate>
        {error && <div className="form-alert form-alert--error span-all">{error}</div>}
        {!editing && (
          <>
            <FormField label="Type of bird" required>
              <select className="select" value={form.category} onChange={chooseCategory}>
                <option value="">Select</option>
                {birdCategories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Batch code" hint="Leave blank to generate one, e.g. BRL-260929-01">
              <input className="input" value={form.batchCode} onChange={set('batchCode')} maxLength={40} style={{ textTransform: 'uppercase' }} />
            </FormField>
          </>
        )}
        <FormField label="Arrival / purchase date" required>
          <input className="input" type="date" max={today()} value={form.purchaseDate} onChange={set('purchaseDate')} />
        </FormField>
        <FormField label="Age on arrival (days)" hint="1 = day-old chicks">
          <input className="input" type="number" min="1" value={form.ageAtPurchaseDays} onChange={set('ageAtPurchaseDays')} />
        </FormField>
        <FormField label="Number of birds" required>
          <input className="input" type="number" min="1" value={form.quantityPurchased} onChange={set('quantityPurchased')} />
        </FormField>
        <FormField label="Cost per bird (₦)">
          <input className="input" type="number" min="0" step="10" value={form.unitCost} onChange={set('unitCost')} />
        </FormField>
        <FormField label="Sell at age (days)" required hint="The batch is flagged ready at this age">
          <input className="input" type="number" min="1" value={form.targetAgeDays} onChange={set('targetAgeDays')} />
        </FormField>
        <FormField label="Target weight (kg)" hint="Optional, for comparing weigh-ins">
          <input className="input" type="number" min="0" step="0.05" value={form.targetWeightKg} onChange={set('targetWeightKg')} />
        </FormField>
        <FormField label="Breed / strain">
          <input className="input" value={form.breed} onChange={set('breed')} maxLength={80} />
        </FormField>
        <FormField label="Supplier / hatchery">
          <input className="input" value={form.supplier} onChange={set('supplier')} maxLength={150} />
        </FormField>
        <FormField label="House / pen">
          <input className="input" value={form.house} onChange={set('house')} maxLength={80} placeholder="e.g. Pen 3" />
        </FormField>
        <FormField label="Notes" className="span-all">
          <textarea className="textarea" rows={2} value={form.notes} onChange={set('notes')} maxLength={1000} />
        </FormField>
        {ageNow !== null && (
          <p className="form-alert form-alert--info span-all">
            Today the batch is <strong>day {ageNow}</strong> ({Math.floor(ageNow / 7)} weeks old)
            {readyDate && (
              <>
                {' '}
                and will be ready on <strong>{formatDate(readyDate)}</strong>
              </>
            )}
            .
          </p>
        )}
      </form>
    </Modal>
  );
}
