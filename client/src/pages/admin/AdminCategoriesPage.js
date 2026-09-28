import { useState } from 'react';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
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
import './AdminCategoriesPage.css';

const BLANK = { name: '', slug: '', description: '', image: null, variantType: 'weight', sortOrder: 0, isActive: true };

export default function AdminCategoriesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => adminService.listCategories(), []);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setEditing((c) => ({ ...c, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!editing.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    setBusy(true);
    try {
      const payload = { ...editing, sortOrder: Number(editing.sortOrder) || 0 };
      if (editing._id) await adminService.updateCategory(editing._id, payload);
      else await adminService.createCategory(payload);
      toast.success('Category saved');
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
      await adminService.deleteCategory(deleting._id);
      toast.success('Category deleted');
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
        eyebrow="Catalogue"
        title="Categories"
        subtitle="Broilers, Noilers, Eggs and Turkeys are created automatically. Add images and descriptions, or add new product lines."
        actions={
          <button type="button" className="btn btn--accent" onClick={() => setEditing(BLANK)}>
            <Plus /> New Category
          </button>
        }
      />
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <DataTable
          loading={loading}
          rows={data}
          empty={{ icon: Tags, title: 'No categories', text: 'Restart the server to recreate the default categories, or add one.' }}
          columns={[
            {
              key: 'name',
              header: 'Category',
              render: (c) => (
                <div className="cell-main">
                  <SmartImage src={c.image?.url} alt="" width={100} ratio="1 / 1" />
                  <div>
                    <span className="cell-title">{c.name}</span>
                    <span className="cell-sub">/{c.slug}</span>
                  </div>
                </div>
              ),
            },
            { key: 'variantType', header: 'Options', render: (c) => (c.variantType === 'packaging' ? 'Pack sizes' : 'Weight bands') },
            { key: 'productCount', header: 'Products', align: 'right', render: (c) => <span className="cell-number">{c.productCount}</span> },
            { key: 'sortOrder', header: 'Order', align: 'right', hideOnMobile: true },
            { key: 'isActive', header: 'Status', render: (c) => <StatusBadge tone={c.isActive ? 'success' : 'neutral'} size="sm">{c.isActive ? 'Active' : 'Hidden'}</StatusBadge> },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (c) => (
                <div className="cell-actions">
                  <button type="button" className="icon-btn" onClick={() => setEditing({ ...BLANK, ...c })} aria-label="Edit">
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
        title={editing?._id ? `Edit ${editing.name}` : 'New category'}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="category-form" className="btn btn--primary" disabled={busy}>
              {busy && <span className="spinner" />} Save
            </button>
          </>
        }
      >
        {editing && (
          <form id="category-form" className="form-grid" onSubmit={save}>
            <FormField label="Name" required>
              <input className="input" value={editing.name} onChange={set('name')} />
            </FormField>
            <FormField label="URL slug" hint="Leave blank to generate from the name">
              <input className="input" value={editing.slug} onChange={set('slug')} />
            </FormField>
            <FormField label="Customers choose by">
              <select className="select" value={editing.variantType} onChange={set('variantType')}>
                <option value="weight">Weight / size bands</option>
                <option value="packaging">Pack sizes</option>
              </select>
            </FormField>
            <FormField label="Display order">
              <input className="input" type="number" value={editing.sortOrder} onChange={set('sortOrder')} />
            </FormField>
            <FormField label="Description" className="span-all">
              <textarea className="textarea" rows={3} value={editing.description || ''} onChange={set('description')} />
            </FormField>
            <div className="span-all">
              <ImageUploader folder="categories" label="Category image" value={editing.image} onChange={(image) => setEditing((c) => ({ ...c, image }))} />
            </div>
            <label className="switch span-all">
              <input type="checkbox" checked={editing.isActive} onChange={set('isActive')} />
              <span className="switch__track" /> Visible on the website
            </label>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete category?"
        message={deleting ? `"${deleting.name}" will be deleted. Categories that still contain products cannot be deleted.` : ''}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
