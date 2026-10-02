import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Beef, Bird, Scale, Percent, Search, CalendarClock, Package, AlertTriangle } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import ProcessingRunModal from '../../components/ProcessingRunModal';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { formatDate } from '../../utils/format';
import { MEAT_STORAGE } from '../../utils/constants';
import './AdminMarketTripsPage.css'; // shared step strip (trip-flow)
import './AdminProcessingPage.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const n = (v) => Number(v || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });

/** Days from today to a use-by date (negative once passed). */
export const daysUntil = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / DAY_MS);
};

export function UseByBadge({ date, cancelled = false }) {
  if (!date) return <span className="cell-sub">—</span>;
  const days = daysUntil(date);
  const tone = cancelled ? 'neutral' : days < 0 ? 'danger' : days <= 1 ? 'warning' : 'success';
  const text = cancelled ? formatDate(date) : days < 0 ? `Passed ${formatDate(date)}` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : formatDate(date);
  return (
    <StatusBadge tone={tone} size="sm">
      {text}
    </StatusBadge>
  );
}

export const outputsText = (run) => run.outputs.map((o) => `${o.quantity} × ${o.productName}${o.variantLabel ? ` (${o.variantLabel})` : ''}`).join(', ');

export default function AdminProcessingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const q = useDebounce(search);
  const { data, loading, error, reload } = useFetch(() => adminService.listProcessing({ status, source, q, page, limit: 20 }), [status, source, q, page]);
  const s = data?.summary;
  const meatStock = data?.meatStock || [];
  const expiring = data?.expiring || [];

  const filter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Livestock"
        title="Meat Processing"
        subtitle="Turn live birds into prepared meat. Each run takes birds from a ready flock batch or from live-bird stock and adds the dressed, cut or cooked meat to Prepared Meat stock."
        actions={
          <>
            <Link to="/admin/products/new" className="btn btn--outline">
              <Package /> New meat product
            </Link>
            <button type="button" className="btn btn--accent" onClick={() => setCreating(true)}>
              <Plus /> New processing run
            </button>
          </>
        }
      />

      <ol className="trip-flow" aria-label="How meat processing works">
        <li>
          <span>1</span>
          <div>
            <strong>Birds in</strong>
            <small>From a ready flock batch or live-bird stock</small>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Process & weigh</strong>
            <small>Record condemned birds, live and dressed weight</small>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Meat into stock</strong>
            <small>Chilled, frozen or ready to eat — with a use-by date</small>
          </div>
        </li>
      </ol>

      {expiring.length > 0 && (
        <div className="proc-expiring" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Prepared meat reaching its use-by date</strong>
            <ul>
              {expiring.map((r) => (
                <li key={r._id}>
                  <Link to={`/admin/processing/${r._id}`} className="link">
                    {r.runNumber}
                  </Link>{' '}
                  · {MEAT_STORAGE[r.storage]?.label} · <UseByBadge date={r.useBy} /> · {outputsText(r)}
                </li>
              ))}
            </ul>
            <small>Sell what is left first, or record it as spoiled in Mortality & Losses.</small>
          </div>
        </div>
      )}

      <div className="stats-grid proc-stats">
        <AdminStatsCard
          tone="dark"
          icon={Beef}
          label="Prepared meat in stock"
          value={s ? `${n(s.meatInStock)} units` : '—'}
          hint={s ? `${n(s.meatAvailable)} available · ${s.meatProducts} product(s)` : ''}
          to="/admin/inventory"
        />
        <AdminStatsCard icon={Bird} label="Birds processed (30 days)" value={s ? n(s.birds30d) : '—'} hint={s ? `${s.runs30d} run(s) · ${n(s.condemned30d)} condemned` : ''} />
        <AdminStatsCard icon={Scale} label="Meat produced (30 days)" value={s ? `${n(s.units30d)} units` : '—'} hint={s?.dressedKg30d ? `${n(s.dressedKg30d)} kg dressed` : 'Add weights to track kg'} />
        <AdminStatsCard
          tone={s?.expiringSoon ? 'red' : 'amber'}
          icon={s?.expiringSoon ? CalendarClock : Percent}
          label={s?.expiringSoon ? 'Use-by within 2 days' : 'Average dressing yield'}
          value={s ? (s.expiringSoon ? `${s.expiringSoon} run(s)` : s.avgYield30d !== null ? `${s.avgYield30d}%` : '—') : '—'}
          hint={s?.expiringSoon ? 'Check stock and sell first' : 'Dressed ÷ live weight, last 30 days'}
        />
      </div>

      <div className="proc-layout">
        <section className="admin-card proc-meat">
          <div className="admin-card__head">
            <h2>Prepared meat stock</h2>
            <Link to="/products/prepared-meat" className="link" target="_blank" rel="noreferrer">
              Shop page
            </Link>
          </div>
          {meatStock.length ? (
            <ul className="proc-meat__list">
              {meatStock.map((l) => (
                <li key={`${l.productId}:${l.variantId || ''}`}>
                  <Link to={`/admin/products/${l.productId}/edit`}>
                    <span>
                      <strong>{l.productName}</strong>
                      <small>
                        {l.variantLabel || 'Single option'}
                        {l.isActive === false ? ' · hidden from shop' : ''}
                        {l.reserved ? ` · ${l.reserved} reserved` : ''}
                      </small>
                    </span>
                    <b className={l.stock ? '' : 'is-zero'}>{l.stock}</b>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="admin-card__body">
              <EmptyState
                compact
                icon={Beef}
                title="No prepared meat products yet"
                text="Create products in the Prepared Meat category — e.g. Whole Dressed Chicken, Chicken Wings, Roasted Chicken."
                action={
                  <Link to="/admin/products/new" className="btn btn--primary btn--sm">
                    <Plus /> New meat product
                  </Link>
                }
              />
            </div>
          )}
        </section>

        <div className="proc-runs">
          <div className="admin-toolbar">
            <div className="input-group">
              <Search aria-hidden="true" />
              <input className="input" type="search" placeholder="Run number, batch or product…" value={search} onChange={filter(setSearch)} />
            </div>
            <select className="select" value={source} onChange={filter(setSource)} aria-label="Source">
              <option value="">All sources</option>
              <option value="BATCH">From flock batches</option>
              <option value="STOCK">From live-bird stock</option>
            </select>
            <select className="select" value={status} onChange={filter(setStatus)} aria-label="Status">
              <option value="">All runs</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <>
              <DataTable
                loading={loading}
                rows={data?.runs}
                onRowClick={(r) => navigate(`/admin/processing/${r._id}`)}
                empty={{
                  icon: Beef,
                  title: 'No processing runs yet',
                  text: 'When birds are slaughtered and dressed, record the run here so live stock goes down and prepared meat goes up.',
                  action: (
                    <button type="button" className="btn btn--accent" onClick={() => setCreating(true)}>
                      <Plus /> New processing run
                    </button>
                  ),
                }}
                columns={[
                  {
                    key: 'run',
                    header: 'Run',
                    render: (r) => (
                      <div>
                        <span className="cell-title">{r.runNumber}</span>
                        <span className="cell-sub">{formatDate(r.processedOn)}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'source',
                    header: 'Birds in',
                    render: (r) => (
                      <div>
                        <span className="cell-title">{r.birdsIn}</span>
                        <span className="cell-sub">
                          {r.sourceName}
                          {r.condemned ? ` · ${r.condemned} condemned` : ''}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'outputs',
                    header: 'Meat out',
                    hideOnMobile: true,
                    render: (r) => (
                      <div>
                        <span className="cell-title">
                          {r.unitsOut} unit{r.unitsOut === 1 ? '' : 's'}
                          {r.dressedKg ? ` · ${n(r.dressedKg)} kg` : ''}
                        </span>
                        <span className="cell-sub trips-products">{outputsText(r)}</span>
                      </div>
                    ),
                  },
                  { key: 'yield', header: 'Yield', align: 'right', hideOnMobile: true, render: (r) => <span className="cell-number">{r.yieldPct !== null && r.yieldPct !== undefined ? `${r.yieldPct}%` : '—'}</span> },
                  {
                    key: 'useBy',
                    header: 'Use by',
                    render: (r) => (
                      <div className="proc-useby">
                        <UseByBadge date={r.useBy} cancelled={r.status === 'CANCELLED'} />
                        <span className="cell-sub">{MEAT_STORAGE[r.storage]?.label}</span>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (r) => (
                      <StatusBadge tone={r.status === 'CANCELLED' ? 'neutral' : 'success'} size="sm">
                        {r.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
                      </StatusBadge>
                    ),
                  },
                ]}
              />
              {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />}
            </>
          )}
          <p className="proc-help">
            Birds from a flock batch can be processed once the batch is <Link to="/admin/batches?status=READY" className="link">ready</Link>. Meat that spoils is recorded in{' '}
            <Link to="/admin/losses" className="link">
              Mortality & Losses
            </Link>
            .
          </p>
        </div>
      </div>

      <ProcessingRunModal open={creating} onClose={() => setCreating(false)} onCreated={(run) => navigate(`/admin/processing/${run._id}`)} />
    </>
  );
}
