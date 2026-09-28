import { useState } from 'react';
import { Search, Mail, Trash2, Reply } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import Modal, { ConfirmDialog } from '../../components/Modal';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, humanize } from '../../utils/format';
import './AdminMessagesPage.css';

const STATUSES = ['NEW', 'READ', 'RESPONDED', 'ARCHIVED'];

export default function AdminMessagesPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounce(search);
  const { data, loading, error, reload } = useFetch(() => adminService.listMessages({ q, status, page, limit: 20 }), [q, status, page]);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const setMessageStatus = async (message, next) => {
    try {
      await adminService.updateMessage(message._id, { status: next });
      setViewing((v) => (v && v._id === message._id ? { ...v, status: next } : v));
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const open = (message) => {
    setViewing(message);
    if (message.status === 'NEW') setMessageStatus(message, 'READ');
  };

  const remove = async () => {
    setBusy(true);
    try {
      await adminService.deleteMessage(deleting._id);
      toast.success('Message deleted');
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
      <AdminPageHeader eyebrow="Sales" title="Messages" subtitle="Enquiries submitted through the contact form." />
      <div className="admin-toolbar">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Name, email, subject or message…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status">
          <option value="">All messages</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            loading={loading}
            rows={data?.messages}
            onRowClick={open}
            empty={{ icon: Mail, title: 'No messages', text: 'Contact form submissions appear here.' }}
            columns={[
              {
                key: 'name',
                header: 'From',
                render: (m) => (
                  <div className={m.status === 'NEW' ? 'msg-unread' : ''}>
                    <span className="cell-title">{m.name}</span>
                    <span className="cell-sub">{m.email}</span>
                  </div>
                ),
              },
              {
                key: 'subject',
                header: 'Message',
                render: (m) => (
                  <div className="msg-preview">
                    <span className="cell-title">{m.subject || 'No subject'}</span>
                    <span className="cell-sub">{m.message}</span>
                  </div>
                ),
              },
              { key: 'createdAt', header: 'Received', hideOnMobile: true, render: (m) => formatDateTime(m.createdAt) },
              { key: 'status', header: 'Status', render: (m) => <StatusBadge status={m.status} size="sm" /> },
            ]}
          />
          {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />}
        </>
      )}

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.subject || 'Message'}
        subtitle={viewing ? `${viewing.name} · ${formatDateTime(viewing.createdAt)}` : ''}
        footer={
          viewing && (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setDeleting(viewing)}>
                <Trash2 /> Delete
              </button>
              <select className="select msg-status" value={viewing.status} onChange={(e) => setMessageStatus(viewing, e.target.value)} aria-label="Status">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
              <a
                href={`mailto:${viewing.email}?subject=${encodeURIComponent(`Re: ${viewing.subject || 'Your enquiry'}`)}`}
                className="btn btn--primary"
                onClick={() => setMessageStatus(viewing, 'RESPONDED')}
              >
                <Reply /> Reply by email
              </a>
            </>
          )
        }
      >
        {viewing && (
          <div className="msg-detail">
            <dl>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${viewing.email}`} className="link">
                    {viewing.email}
                  </a>
                </dd>
              </div>
              {viewing.phone && (
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${viewing.phone}`} className="link">
                      {viewing.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            <p className="msg-detail__body">{viewing.message}</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete message?"
        message="This message will be permanently deleted."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
