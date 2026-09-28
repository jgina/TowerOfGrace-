import { useState } from 'react';
import { Plus, Skull, Egg, ClipboardList, Undo2, HeartPulse } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import RecordLossModal from '../../components/RecordLossModal';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { LOSS_REASONS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/format';
import './AdminLossesPage.css';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
];

export default function AdminLossesPage() {
  const toast = useToast();
  const [period, setPeriod] = useState('30');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [recording, setRecording] = useState(false);
  const [reversing, setReversing] = useState(null);
  const [reverseNote, setReverseNote] = useState('');
  const [busy, setBusy] = useState(false);

  const categories = useFetch(() => adminService.listCategories(), []);
  const from = period === 'all' ? undefined : daysAgo(Number(period));
  const { data, loading, error, reload } = useFetch(
    () => adminService.listLosses({ from, reason, category, status, page, limit: 25 }),
    [from, reason, category, status, page]
  );
  const summary = data?.summary;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.toLowerCase();
  const maxReason = Math.max(...(summary?.byReason || []).map((r) => r.units), 1);

  const reverse = async () => {
    setBusy(true);
    try {
      const result = await adminService.reverseLoss(reversing._id, reverseNote);
      toast.success(result.message);
      setReversing(null);
      setReverseNote('');
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const filtersChanged = (fn) => (e) => {
    fn(e.target.value);
    setPage(1);
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Mortality & Losses"
        subtitle="Record dead birds, broken eggs and other losses. Each entry deducts from stock so product figures stay accurate."
        actions={
          <button type="button" className="btn btn--accent" onClick={() => setRecording(true)}>
            <Plus /> Record Loss
          </button>
        }
      />

      <div className="stats-grid losses-stats">
        <AdminStatsCard tone="red" icon={Skull} label="Birds lost" value={summary?.birds ?? '—'} hint={periodLabel} />
        <AdminStatsCard tone="amber" icon={Egg} label="Eggs lost (packs)" value={summary?.eggs ?? '—'} hint={periodLabel} />
        <AdminStatsCard icon={ClipboardList} label="Loss records" value={summary?.records ?? '—'} hint={periodLabel} />
        <AdminStatsCard
          tone="dark"
          icon={HeartPulse}
          label="Top cause"
          value={summary?.byReason?.[0] ? LOSS_REASONS[summary.byReason[0].reason]?.label.split(' (')[0] : 'None'}
          hint={summary?.byReason?.[0] ? `${summary.byReason[0].units} unit(s)` : 'No losses recorded'}
        />
      </div>

      {summary && summary.units > 0 && (
        <div className="losses-breakdown">
          <section className="admin-card">
            <div className="admin-card__head">
              <h2>By cause</h2>
            </div>
            <div className="admin-card__body losses-bars">
              {summary.byReason.map((r) => (
                <div key={r.reason} className="losses-bars__row">
                  <span>{LOSS_REASONS[r.reason]?.label || r.reason}</span>
                  <span className="losses-bars__track">
                    <span className="losses-bars__bar" style={{ width: `${(r.units / maxReason) * 100}%` }} />
                  </span>
                  <strong>{r.units}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Most affected</h2>
            </div>
            <div className="admin-card__body">
              <ul className="losses-top">
                {summary.byProduct.map((p) => (
                  <li key={`${p.productId}-${p.variantLabel || ''}`}>
                    <span>
                      <strong>{p.productName}</strong>
                      <small>{[p.categoryName, p.variantLabel].filter(Boolean).join(' · ')}</small>
                    </span>
                    <strong className="losses-top__units">{p.units}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      )}

      <div className="admin-toolbar">
        <select className="select" value={period} onChange={filtersChanged(setPeriod)} aria-label="Period">
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select className="select" value={category} onChange={filtersChanged(setCategory)} aria-label="Category">
          <option value="">All categories</option>
          {(categories.data || []).map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" value={reason} onChange={filtersChanged(setReason)} aria-label="Reason">
          <option value="">All reasons</option>
          {Object.entries(LOSS_REASONS).map(([code, r]) => (
            <option key={code} value={code}>
              {r.label}
            </option>
          ))}
        </select>
        <select className="select" value={status} onChange={filtersChanged(setStatus)} aria-label="Record status">
          <option value="active">Active records</option>
          <option value="reversed">Reversed (corrections)</option>
          <option value="">All records</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            loading={loading}
            rows={data?.records}
            empty={{
              icon: Skull,
              title: 'No losses recorded',
              text: 'When birds die or eggs break, record them here so stock and sales figures stay accurate.',
              action: (
                <button type="button" className="btn btn--accent" onClick={() => setRecording(true)}>
                  <Plus /> Record Loss
                </button>
              ),
            }}
            columns={[
              {
                key: 'occurredOn',
                header: 'Date',
                render: (r) => (
                  <div>
                    <span className="cell-title">{formatDate(r.occurredOn)}</span>
                    <span className="cell-sub">by {r.recordedByName || 'Admin'}</span>
                  </div>
                ),
              },
              {
                key: 'product',
                header: 'Product',
                render: (r) => (
                  <div>
                    <span className="cell-title">{r.productName}</span>
                    <span className="cell-sub">{[r.categoryName, r.variantLabel].filter(Boolean).join(' · ')}</span>
                  </div>
                ),
              },
              { key: 'quantity', header: 'Qty', align: 'right', render: (r) => <strong className="cell-number losses-qty">−{r.quantity}</strong> },
              { key: 'reason', header: 'Reason', render: (r) => <StatusBadge tone={r.reason === 'BROKEN' || r.reason === 'SPOILED' ? 'warning' : 'danger'} size="sm">{LOSS_REASONS[r.reason]?.label || r.reason}</StatusBadge> },
              {
                key: 'stock',
                header: 'Stock',
                hideOnMobile: true,
                render: (r) => (
                  <span className="cell-number">
                    {r.stockBefore} → {r.stockAfter}
                  </span>
                ),
              },
              { key: 'notes', header: 'Notes', hideOnMobile: true, render: (r) => <span className="losses-notes">{r.notes || '—'}</span> },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (r) =>
                  r.reversedAt ? (
                    <span className="cell-sub" title={r.reversalNote || ''}>
                      Reversed {formatDateTime(r.reversedAt)}
                    </span>
                  ) : (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReversing(r)}>
                      <Undo2 /> Reverse
                    </button>
                  ),
              },
            ]}
          />
          {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />}
        </>
      )}

      <RecordLossModal open={recording} onClose={() => setRecording(false)} onSaved={reload} />

      <Modal
        open={Boolean(reversing)}
        onClose={() => setReversing(null)}
        title="Reverse this record?"
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setReversing(null)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={reverse} disabled={busy}>
              {busy && <span className="spinner" />} Reverse & restore stock
            </button>
          </>
        }
      >
        {reversing && (
          <div className="stack">
            <p className="text-muted">
              Use this only to correct a mistake. {reversing.quantity} unit(s) of {reversing.productName}
              {reversing.variantLabel ? ` (${reversing.variantLabel})` : ''} will be added back to stock. The record is kept and marked as reversed.
            </p>
            <FormField label="Reason for reversal">
              <input className="input" value={reverseNote} onChange={(e) => setReverseNote(e.target.value)} placeholder="e.g. entered the wrong quantity" />
            </FormField>
          </div>
        )}
      </Modal>
    </>
  );
}
