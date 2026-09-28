import { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import Modal, { ConfirmDialog } from '../../components/Modal';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { NIGERIAN_STATES } from '../../utils/constants';
import './AccountPages.css';

const BLANK = { label: 'Home', fullName: '', phone: '', address: '', city: '', state: '', isDefault: false };

export default function AddressesPage() {
  const toast = useToast();
  const { data: addresses, loading, error, reload, setData } = useFetch(() => authService.listAddresses(), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!editing.address || !editing.city || !editing.state) {
      toast.error('Address, city and state are required');
      return;
    }
    setBusy(true);
    try {
      const { _id, ...payload } = editing;
      setData(_id ? await authService.updateAddress(_id, payload) : await authService.addAddress(payload));
      toast.success('Address saved');
      setEditing(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      setData(await authService.deleteAddress(deleting._id));
      toast.success('Address removed');
      setDeleting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (field) => (e) => setEditing((a) => ({ ...a, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="card account-panel">
      <div className="account-panel__head">
        <h2>Saved Addresses</h2>
        <button type="button" className="btn btn--accent btn--sm" onClick={() => setEditing(BLANK)}>
          <Plus /> Add address
        </button>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="skeleton" style={{ height: 140 }} />
      ) : addresses.length ? (
        <div className="address-grid">
          {addresses.map((a) => (
            <div key={a._id} className={`address-card ${a.isDefault ? 'is-default' : ''}`}>
              <div className="address-card__head">
                <strong>{a.label}</strong>
                {a.isDefault && <StatusBadge tone="accent" size="sm">Default</StatusBadge>}
              </div>
              {a.fullName && <span>{a.fullName}</span>}
              <span className="text-muted">
                {a.address}, {a.city}, {a.state}
              </span>
              {a.phone && <span className="text-muted">{a.phone}</span>}
              <div className="address-card__actions">
                <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditing(a)}>
                  <Pencil /> Edit
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeleting(a)}>
                  <Trash2 /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={MapPin} compact title="No saved addresses" text="Save an address for faster checkout." />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit address' : 'Add address'}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="address-form" className="btn btn--primary" disabled={busy}>
              {busy && <span className="spinner" />} Save address
            </button>
          </>
        }
      >
        {editing && (
          <form id="address-form" className="form-grid" onSubmit={save}>
            <FormField label="Label">
              <input className="input" value={editing.label} onChange={set('label')} placeholder="Home, Office…" />
            </FormField>
            <FormField label="Recipient name">
              <input className="input" value={editing.fullName || ''} onChange={set('fullName')} />
            </FormField>
            <FormField label="Address" required className="span-all">
              <input className="input" value={editing.address} onChange={set('address')} />
            </FormField>
            <FormField label="City" required>
              <input className="input" value={editing.city} onChange={set('city')} />
            </FormField>
            <FormField label="State" required>
              <select className="select" value={editing.state} onChange={set('state')}>
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Phone">
              <input className="input" value={editing.phone || ''} onChange={set('phone')} />
            </FormField>
            <label className="checkbox span-all">
              <input type="checkbox" checked={Boolean(editing.isDefault)} onChange={set('isDefault')} /> Use as default address
            </label>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove address?"
        message={deleting ? `${deleting.address}, ${deleting.city} will be removed.` : ''}
        confirmLabel="Remove"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
