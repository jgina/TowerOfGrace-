import { useState } from 'react';
import { Plus, Pencil, Trash2, Award, Info } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import DataTable from '../../components/DataTable';
import SmartImage from '../../components/SmartImage';
import StatusBadge from '../../components/StatusBadge';
import Modal, { ConfirmDialog } from '../../components/Modal';
import FormField from '../../components/FormField';
import ImageUploader from '../../components/ImageUploader';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDate, toDateInput } from '../../utils/format';
import './AdminCertificationsPage.css';

const BLANK = { name: '', issuingOrganisation: '', certificateNumber: '', issueDate: '', expiryDate: '', image: null, status: 'ACTIVE', isPublic: true };

export default function AdminCertificationsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => adminService.listCertifications(), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setEditing((c) => ({ ...c, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!editing.name.trim() || !editing.issuingOrganisation.trim()) {
      toast.error('Certification name and issuing organisation are required');
      return;
    }
    if (editing.issueDate && editing.expiryDate && editing.expiryDate < editing.issueDate) {
      toast.error('Expiry date must be after the issue date');
      return;
    }
    setBusy(true);
    try {
      if (editing._id) await adminService.updateCertification(editing._id, editing);
      else await adminService.createCertification(editing);
      toast.success('Certification saved');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminService.deleteCertification(deleting._id);
      toast.success('Certification deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Website"
        title="Certifications"
        subtitle="Upload genuine certificates and approvals. Active, public certificates appear on the Quality & Hygiene page."
        actions={
          <button type="button" className="btn btn--accent" onClick={() => setEditing(BLANK)}>
            <Plus /> Add Certification
          </button>
        }
      />
      <div className="admin-hint cert-hint">
        <Info /> Only add certifications the company actually holds. Each entry should match a real certificate document.
      </div>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <DataTable
          loading={loading}
          rows={data}
          empty={{ icon: Award, title: 'No certifications added', text: 'The certifications block stays hidden on the website until one is added.' }}
          columns={[
            {
              key: 'name',
              header: 'Certification',
              render: (c) => (
                <div className="cell-main">
                  <SmartImage src={c.image?.url} alt="" width={100} ratio="1 / 1" />
                  <div>
                    <span className="cell-title">{c.name}</span>
                    <span className="cell-sub">{c.issuingOrganisation}</span>
                  </div>
                </div>
              ),
            },
            { key: 'certificateNumber', header: 'Certificate No.', hideOnMobile: true, render: (c) => c.certificateNumber || '—' },
            { key: 'issueDate', header: 'Issued', render: (c) => formatDate(c.issueDate) },
            { key: 'expiryDate', header: 'Expires', render: (c) => formatDate(c.expiryDate) },
            { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} size="sm" /> },
            { key: 'isPublic', header: 'On website', render: (c) => (c.isPublic && c.status === 'ACTIVE' ? 'Yes' : 'No') },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (c) => (
                <div className="cell-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setEditing({ ...BLANK, ...c, issueDate: toDateInput(c.issueDate), expiryDate: toDateInput(c.expiryDate) })}
                    aria-label="Edit"
                  >
                    <Pencil />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => setDeleting(c)} aria-label="Delete">
                    <Trash2 />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit certification' : 'Add certification'}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="cert-form" className="btn btn--primary" disabled={busy}>
              {busy && <span className="spinner" />} Save
            </button>
          </>
        }
      >
        {editing && (
          <form id="cert-form" className="form-grid" onSubmit={save}>
            <FormField label="Certification name" required className="span-all">
              <input className="input" value={editing.name} onChange={set('name')} />
            </FormField>
            <FormField label="Issuing organisation" required>
              <input className="input" value={editing.issuingOrganisation} onChange={set('issuingOrganisation')} />
            </FormField>
            <FormField label="Certificate number">
              <input className="input" value={editing.certificateNumber} onChange={set('certificateNumber')} />
            </FormField>
            <FormField label="Issue date">
              <input className="input" type="date" value={editing.issueDate} onChange={set('issueDate')} />
            </FormField>
            <FormField label="Expiry date">
              <input className="input" type="date" value={editing.expiryDate} onChange={set('expiryDate')} />
            </FormField>
            <FormField label="Status">
              <select className="select" value={editing.status} onChange={set('status')}>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="EXPIRED">Expired</option>
                <option value="REVOKED">Revoked</option>
              </select>
            </FormField>
            <label className="switch">
              <input type="checkbox" checked={editing.isPublic} onChange={set('isPublic')} />
              <span className="switch__track" /> Show on website
            </label>
            <div className="span-all">
              <ImageUploader folder="certifications" label="Certificate image" value={editing.image} onChange={(image) => setEditing((c) => ({ ...c, image }))} />
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete certification?"
        message={deleting ? `"${deleting.name}" and its image will be deleted.` : ''}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
