import { useState } from 'react';
import { Search, Building2, Phone, Mail, MapPin, Trash2 } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal, { ConfirmDialog } from '../../components/Modal';
import FormField from '../../components/FormField';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { BUSINESS_TYPES } from '../../utils/constants';
import { formatDateTime, humanize } from '../../utils/format';
import './AdminBulkOrdersPage.css';

const STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'CLOSED'];

export default function AdminBulkOrdersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);
  const { data, loading, error, reload } = useFetch(
    () => adminService.listBulkOrders({ q, status, businessType, page, limit: 20 }),
    [q, status, businessType, page]
  );
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await adminService.updateBulkOrder(viewing._id, { status: viewing.status, adminNotes: viewing.adminNotes });
      toast.success('Request updated');
      setViewing(null);
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
      await adminService.deleteBulkOrder(deleting._id);
      toast.success('Request deleted');
      setDeleting(null);
      setViewing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminPageHeader eyebrow="Sales" title="Bulk Order Requests" subtitle="Enquiries from hotels, restaurants, retailers, distributors and other businesses." />
      <div className="admin-toolbar">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Business, contact, email, product…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <select className="select" value={businessType} onChange={(e) => { setBusinessType(e.target.value); setPage(1); }} aria-label="Business type">
          <option value="">All business types</option>
          {BUSINESS_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            loading={loading}
            rows={data?.requests}
            onRowClick={(r) => setViewing({ ...r, adminNotes: r.adminNotes || '' })}
            empty={{ icon: Building2, title: 'No bulk requests', text: 'Requests submitted from the Bulk Orders page appear here.' }}
            columns={[
              {
                key: 'businessName',
                header: 'Business',
                render: (r) => (
                  <div>
                    <span className="cell-title">{r.businessName}</span>
                    <span className="cell-sub">{r.businessType}</span>
                  </div>
                ),
              },
              {
                key: 'contact',
                header: 'Contact',
                render: (r) => (
                  <div>
                    <span className="cell-title">{r.contactPerson}</span>
                    <span className="cell-sub">{r.phone}</span>
                  </div>
                ),
              },
              {
                key: 'product',
                header: 'Request',
                render: (r) => (
                  <div>
                    <span className="cell-title">{r.product}</span>
                    <span className="cell-sub">
                      {r.quantity}
                      {r.preferredWeight ? ` · ${r.preferredWeight}` : ''}
                    </span>
                  </div>
                ),
              },
              { key: 'createdAt', header: 'Received', hideOnMobile: true, render: (r) => formatDateTime(r.createdAt) },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} size="sm" /> },
            ]}
          />
          {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />}
        </>
      )}

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.businessName}
        subtitle={viewing ? `${viewing.businessType} · received ${formatDateTime(viewing.createdAt)}` : ''}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setDeleting(viewing)}>
              <Trash2 /> Delete
            </button>
            <button type="button" className="btn btn--primary" onClick={save} disabled={busy}>
              {busy && <span className="spinner" />} Save
            </button>
          </>
        }
      >
        {viewing && (
          <div className="bulk-detail">
            <div className="bulk-detail__grid">
              <div>
                <span className="field__label">Contact person</span>
                <p>{viewing.contactPerson}</p>
                <a href={`tel:${viewing.phone}`} className="bulk-detail__link">
                  <Phone /> {viewing.phone}
                </a>
                <a href={`mailto:${viewing.email}`} className="bulk-detail__link">
                  <Mail /> {viewing.email}
                </a>
              </div>
              <div>
                <span className="field__label">Request</span>
                <p>
                  <strong>{viewing.product}</strong>
                </p>
                <p>Quantity: {viewing.quantity}</p>
                {viewing.preferredWeight && <p>Preferred weight/size: {viewing.preferredWeight}</p>}
                <span className="bulk-detail__link">
                  <MapPin /> {viewing.deliveryLocation}
                </span>
              </div>
            </div>
            {viewing.message && (
              <div>
                <span className="field__label">Message</span>
                <p className="bulk-detail__message">{viewing.message}</p>
              </div>
            )}
            <div className="form-grid">
              <FormField label="Status">
                <select className="select" value={viewing.status} onChange={(e) => setViewing({ ...viewing, status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {humanize(s)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Internal notes" className="span-all">
                <textarea className="textarea" rows={3} value={viewing.adminNotes} onChange={(e) => setViewing({ ...viewing, adminNotes: e.target.value })} />
              </FormField>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete request?"
        message="This bulk order request will be permanently deleted."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
