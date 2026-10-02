import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Bird, Egg, Search, BellRing, HeartPulse, Layers, Scale, CalendarClock, ArrowRight } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import BatchStageBar from '../../components/BatchStageBar';
import BatchFormModal from '../../components/BatchFormModal';
import MoveToStockModal from '../../components/MoveToStockModal';
import PushToInventoryButton from '../../components/PushToInventoryButton';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { BATCH_STAGES, isLiveBirds } from '../../utils/constants';
import { formatDate } from '../../utils/format';
import './AdminBatchesPage.css';

const FILTERS = [
  { value: 'open', label: 'Growing & ready' },
  { value: 'READY', label: 'Ready for sale' },
  { value: 'COMPLETED', label: 'Moved to stock' },
  { value: 'CLOSED', label: 'Closed' },
  { value: '', label: 'All batches' },
];

export default function AdminBatchesPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || 'open');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [moving, setMoving] = useState(null);
  const q = useDebounce(search);
  const categories = useFetch(() => adminService.listCategories(), []);
  const { data, loading, error, reload } = useFetch(() => adminService.listBatches({ status, category, q, page, limit: 24 }), [status, category, q, page]);
  const summary = data?.summary;
  const openMortality = summary?.purchasedInOpenBatches ? ((summary.deathsInOpenBatches / summary.purchasedInOpenBatches) * 100).toFixed(1) : '0.0';

  return (
    <>
      <AdminPageHeader
        eyebrow="Livestock"
        title="Flock Batches"
        subtitle="Track every delivery of chicks from day one. Stages change automatically with age, and you are notified when a batch is ready. Birds join shop stock only when you confirm."
        actions={
          <button type="button" className="btn btn--accent" onClick={() => setCreating(true)}>
            <Plus /> New Batch
          </button>
        }
      />

      <div className="stats-grid batches-stats">
        <AdminStatsCard tone="dark" icon={Bird} label="Birds growing" value={summary?.birdsGrowing ?? '—'} hint={`${summary?.openBatches ?? 0} open batch(es) · not in stock yet`} />
        <AdminStatsCard tone="amber" icon={BellRing} label="Ready for sale" value={summary?.readyBatches ?? '—'} hint={`${summary?.birdsReady ?? 0} birds awaiting confirmation`} />
        <AdminStatsCard tone="red" icon={HeartPulse} label="Mortality (open batches)" value={`${openMortality}%`} hint={`${summary?.deathsInOpenBatches ?? 0} deaths recorded`} />
        <AdminStatsCard icon={Layers} label="Batches shown" value={data?.meta?.total ?? '—'} hint={FILTERS.find((f) => f.value === status)?.label} />
      </div>

      <div className="batches-filters" role="tablist" aria-label="Batch status">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            role="tab"
            aria-selected={status === f.value}
            className={status === f.value ? 'is-active' : ''}
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Batch code, supplier, house or breed…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Type of bird">
          <option value="">All birds</option>
          {(categories.data || [])
            .filter((c) => isLiveBirds(c.slug))
            .map((c) => (
              <option key={c._id} value={c.slug}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="batch-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 250 }} />
          ))}
        </div>
      ) : data.batches.length ? (
        <>
          <div className="batch-grid">
            {data.batches.map((b) => {
              const stage = BATCH_STAGES[b.stage];
              const open = ['ACTIVE', 'READY'].includes(b.status);
              return (
                <article key={b._id} className={`batch-card batch-card--${b.stage.toLowerCase()}`}>
                  <header className="batch-card__head">
                    <div>
                      <Link to={`/admin/batches/${b._id}`} className="batch-card__code">
                        {b.batchCode}
                      </Link>
                      <span className="batch-card__meta">
                        {b.categoryName}
                        {b.house ? ` · ${b.house}` : ''}
                      </span>
                    </div>
                    <StatusBadge tone={stage.tone} size="sm">
                      {stage.label}
                    </StatusBadge>
                  </header>

                  <div className="batch-card__age">
                    <strong>Day {b.ageDays}</strong>
                    <span>
                      Week {b.ageWeeks} · target {b.targetAgeDays} days
                    </span>
                  </div>
                  <BatchStageBar batch={b} compact />

                  <dl className="batch-card__figures">
                    <div>
                      <dt>Live</dt>
                      <dd>
                        {b.live}
                        <small>/{b.quantityPurchased}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Deaths</dt>
                      <dd className={b.deaths ? 'is-bad' : ''}>
                        {b.deaths}
                        <small>{b.mortalityRate}%</small>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Scale aria-hidden="true" /> Avg weight
                      </dt>
                      <dd>{b.latestWeightKg ? `${b.latestWeightKg} kg` : '—'}</dd>
                    </div>
                  </dl>

                  <PushToInventoryButton batch={b} size="sm" onClick={() => setMoving(b)} />

                  <footer className="batch-card__foot">
                    {open && b.status !== 'READY' && (
                      <span className="batch-card__eta">
                        <CalendarClock aria-hidden="true" /> Ready {formatDate(b.readyDate)}
                      </span>
                    )}
                    {b.status === 'READY' && <span className="batch-card__eta">Ready since {formatDate(b.readyAt)}</span>}
                    {!open && <span className="batch-card__eta">{b.status === 'COMPLETED' ? `${b.transferred} moved to stock` : b.closeReason || 'Closed'}</span>}
                    <button type="button" className="btn btn--ghost btn--sm batch-card__open" onClick={() => navigate(`/admin/batches/${b._id}`)}>
                      Open <ArrowRight />
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
          <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={Egg}
          title={status === 'open' ? 'No birds growing right now' : 'No batches found'}
          text="When chicks or young birds arrive, create a batch to track their age, growth and deaths until they are ready for sale."
          action={
            <button type="button" className="btn btn--accent" onClick={() => setCreating(true)}>
              <Plus /> New Batch
            </button>
          }
        />
      )}

      <BatchFormModal open={creating} onClose={() => setCreating(false)} onSaved={(b) => navigate(`/admin/batches/${b._id}`)} />
      <MoveToStockModal open={Boolean(moving)} batch={moving} onClose={() => setMoving(null)} onDone={reload} />
    </>
  );
}
