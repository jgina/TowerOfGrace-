import { useState } from 'react';
import { Plus, Pencil, Trash2, Star, Images } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import SmartImage from '../../components/SmartImage';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import Modal, { ConfirmDialog } from '../../components/Modal';
import FormField from '../../components/FormField';
import ImageUploader from '../../components/ImageUploader';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { GALLERY_CATEGORIES } from '../../utils/constants';
import './AdminGalleryPage.css';

const BLANK = { title: '', caption: '', category: 'Farm', image: null, isFeatured: false, sortOrder: 0 };

export default function AdminGalleryPage() {
  const toast = useToast();
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => adminService.listGallery({ category: category || undefined, page, limit: 24 }), [category, page]);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (field) => (e) => setEditing((g) => ({ ...g, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!editing.image?.url) {
      toast.error('Please upload an image');
      return;
    }
    setBusy(true);
    try {
      const payload = { ...editing, sortOrder: Number(editing.sortOrder) || 0 };
      if (editing._id) await adminService.updateGalleryItem(editing._id, payload);
      else await adminService.createGalleryItem(payload);
      toast.success('Gallery updated');
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
      await adminService.deleteGalleryItem(deleting._id);
      toast.success('Image deleted');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleFeatured = async (item) => {
    try {
      await adminService.updateGalleryItem(item._id, { ...item, isFeatured: !item.isFeatured });
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Website"
        title="Gallery"
        subtitle="Upload, caption and categorise farm photos. Featured photos appear on the homepage."
        actions={
          <button type="button" className="btn btn--accent" onClick={() => setEditing(BLANK)}>
            <Plus /> Upload Photo
          </button>
        }
      />

      <div className="admin-toolbar">
        <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Filter by category">
          <option value="">All categories</option>
          {GALLERY_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <span className="text-muted gallery-count">{data?.meta?.total ?? 0} photo(s)</span>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="admin-gallery">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: '4 / 3' }} />
          ))}
        </div>
      ) : data.items.length ? (
        <>
          <div className="admin-gallery">
            {data.items.map((item) => (
              <figure key={item._id} className="admin-gallery__item">
                <SmartImage src={item.image?.url} alt={item.image?.alt || item.title} width={500} ratio="4 / 3" />
                <button
                  type="button"
                  className={`admin-gallery__star ${item.isFeatured ? 'is-on' : ''}`}
                  onClick={() => toggleFeatured(item)}
                  aria-label={item.isFeatured ? 'Unfeature' : 'Feature on homepage'}
                  title={item.isFeatured ? 'Featured on homepage' : 'Feature on homepage'}
                >
                  <Star />
                </button>
                <figcaption>
                  <span className="admin-gallery__cat">{item.category}</span>
                  <strong>{item.title || 'Untitled'}</strong>
                  {item.caption && <small>{item.caption}</small>}
                </figcaption>
                <div className="admin-gallery__actions">
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditing({ ...BLANK, ...item })}>
                    <Pencil /> Edit
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => setDeleting(item)} aria-label="Delete">
                    <Trash2 />
                  </button>
                </div>
              </figure>
            ))}
          </div>
          <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={Images}
          title="No photos yet"
          text="Upload real photos of the farm, birds, facilities and deliveries."
          action={
            <button type="button" className="btn btn--accent" onClick={() => setEditing(BLANK)}>
              <Plus /> Upload Photo
            </button>
          }
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit photo' : 'Upload photo'}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="gallery-form" className="btn btn--primary" disabled={busy}>
              {busy && <span className="spinner" />} Save
            </button>
          </>
        }
      >
        {editing && (
          <form id="gallery-form" className="form-grid" onSubmit={save}>
            <div className="span-all">
              <ImageUploader folder="gallery" label="Photo (upload a new one to replace)" value={editing.image} onChange={(image) => setEditing((g) => ({ ...g, image }))} />
            </div>
            <FormField label="Title">
              <input className="input" value={editing.title} onChange={set('title')} />
            </FormField>
            <FormField label="Category" required>
              <select className="select" value={editing.category} onChange={set('category')}>
                {GALLERY_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Caption" className="span-all">
              <textarea className="textarea" rows={2} value={editing.caption} onChange={set('caption')} maxLength={500} />
            </FormField>
            <FormField label="Display order">
              <input className="input" type="number" value={editing.sortOrder} onChange={set('sortOrder')} />
            </FormField>
            <label className="switch">
              <input type="checkbox" checked={editing.isFeatured} onChange={set('isFeatured')} />
              <span className="switch__track" /> Feature on homepage
            </label>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete photo?"
        message="The photo will be removed from the website and from Cloudinary."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
