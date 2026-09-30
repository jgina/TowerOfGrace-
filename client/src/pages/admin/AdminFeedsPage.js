import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wheat, AlertTriangle, ShoppingCart, ClipboardCheck, Pencil, Utensils, Package, Wallet, CalendarClock } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { FeedFormModal, FeedPurchaseModal, FeedAdjustModal, FeedUsageModal } from '../../components/FeedModals';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { FEED_TX, FEED_TYPES, FED_TO } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/format';
import './AdminFeedsPage.css';

// Older entries have no fedTo: batch-linked ones went to a batch, the rest to the whole farm.
const fedToOf = (t) => t.fedTo || (t.batch ? 'BATCH' : 'FARM');

function FedTo({ t }) {
  const kind = fedToOf(t);
  if (kind === 'BATCH' && t.batch) {
    return (
      <Link to={`/admin/batches/${t.batch}`} className="link">
        {t.batchCode}
      </Link>
    );
  }
  if (kind === 'STOCK') return <span>{t.productName ? `Stock · ${t.productName}` : 'All birds in stock'}</span>;
  if (kind === 'GROUP') return <span>{t.groupName}</span>;
  return <span>Whole farm</span>;
}

const bags = (n) => `${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

// Gauge scale: full bar = 3× the alert level (or current stock if higher), so "low" sits at one third.
const gaugePercent = (feed) => {
  const scale = Math.max(feed.lowStockBags * 3, feed.stockBags, 1);
  return Math.min((feed.stockBags / scale) * 100, 100);
};

export default function AdminFeedsPage() {
  const [modal, setModal] = useState(null); // { kind, feed }
  const [ledgerFeed, setLedgerFeed] = useState('');
  const [ledgerType, setLedgerType] = useState('');
  const [ledgerFedTo, setLedgerFedTo] = useState('');
  const [page, setPage] = useState(1);
  const store = useFetch(() => adminService.listFeeds(), []);
  const ledger = useFetch(() => adminService.feedTransactions({ feed: ledgerFeed, type: ledgerType, fedTo: ledgerFedTo, page, limit: 25 }), [ledgerFeed, ledgerType, ledgerFedTo, page]);
  const refresh = () => {
    store.reload();
    ledger.reload();
  };

  const s = store.data?.summary;
  const feeds = store.data?.feeds || [];
  const low = feeds.filter((f) => f.isLow);
  const close = () => setModal(null);

  return (
    <>
      <AdminPageHeader
        eyebrow="Livestock"
        title="Feed Store"
        subtitle="Bags bought come in, daily feeding goes out, and what remains is always up to date. The admin and the boss are alerted when a feed runs low."
        actions={
          <>
            <button type="button" className="btn btn--outline" onClick={() => setModal({ kind: 'new' })}>
              <Plus /> New feed
            </button>
            <button type="button" className="btn btn--accent" onClick={() => setModal({ kind: 'usage' })} disabled={!feeds.length}>
              <Utensils /> Record daily feeding
            </button>
          </>
        }
      />

      {low.length > 0 && (
        <div className="feed-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>
              {low.length === 1 ? `${low[0].name} is running low` : `${low.length} feeds are running low`}
            </strong>
            <span>{low.map((f) => `${f.name}: ${bags(f.stockBags)} bag(s)`).join(' · ')} — restock soon.</span>
          </div>
          {low.length === 1 && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setModal({ kind: 'purchase', feed: low[0] })}>
              <ShoppingCart /> Record purchase
            </button>
          )}
        </div>
      )}

      <div className="stats-grid feeds-stats">
        <AdminStatsCard tone="dark" icon={Package} label="Bags in store" value={s ? bags(s.totalBags) : '—'} hint={s ? `${bags(s.totalKg)} kg across ${s.feedTypes} feed(s)` : ''} />
        <AdminStatsCard tone={s?.lowFeeds ? 'red' : 'green'} icon={AlertTriangle} label="Feeds low" value={s?.lowFeeds ?? '—'} hint="At or below their alert level" />
        <AdminStatsCard icon={Utensils} label="Fed in last 7 days" value={s ? `${bags(s.used7Days)} bags` : '—'} hint={s?.soonestOut ? `${s.soonestOut.name} lasts ~${s.soonestOut.daysLeft} day(s)` : 'Record feeding to see how long stock lasts'} />
        <AdminStatsCard tone="amber" icon={Wallet} label="Spent on feed (30 days)" value={s ? formatCurrency(s.spent30Days) : '—'} hint={s ? `${bags(s.bought30Days)} bags bought` : ''} />
      </div>

      {s && Object.keys(s.fedTo30Days || {}).length > 0 && (
        <div className="feed-split" aria-label="Feed used in the last 30 days, by who was fed">
          <span className="feed-split__title">Fed in last 30 days</span>
          {Object.entries(FED_TO)
            .filter(([k]) => s.fedTo30Days[k])
            .map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`feed-split__item ${ledgerFedTo === k ? 'is-active' : ''}`}
                onClick={() => { setLedgerFedTo(ledgerFedTo === k ? '' : k); setLedgerType(''); setPage(1); }}
                title="Show these entries in the ledger"
              >
                {label} <strong>{bags(s.fedTo30Days[k])} bags</strong>
              </button>
            ))}
        </div>
      )}

      {store.error ? (
        <ErrorState message={store.error} onRetry={store.reload} />
      ) : store.loading ? (
        <div className="feed-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 220 }} />
          ))}
        </div>
      ) : feeds.length ? (
        <div className="feed-grid">
          {feeds.map((f) => (
            <article key={f._id} className={`feed-card ${f.isLow ? 'is-low' : ''} ${f.stockBags <= 0 ? 'is-out' : ''}`}>
              <header className="feed-card__head">
                <div>
                  <h3>{f.name}</h3>
                  <span>
                    {[FEED_TYPES[f.feedType], f.brand, `${f.bagSizeKg} kg bags`].filter(Boolean).join(' · ')}
                  </span>
                </div>
                {f.stockBags <= 0 ? (
                  <StatusBadge tone="danger" size="sm">Out</StatusBadge>
                ) : f.isLow ? (
                  <StatusBadge tone="danger" size="sm">Low</StatusBadge>
                ) : (
                  <StatusBadge tone="success" size="sm">OK</StatusBadge>
                )}
              </header>

              <div className="feed-card__stock">
                <strong>{bags(f.stockBags)}</strong>
                <span>bags left · {bags(f.stockKg)} kg</span>
              </div>
              <div className="feed-gauge" aria-label={`${f.stockBags} bags; alert at ${f.lowStockBags}`}>
                <span className="feed-gauge__fill" style={{ width: `${gaugePercent(f)}%` }} />
                <span className="feed-gauge__mark" style={{ left: `${(f.lowStockBags / Math.max(f.lowStockBags * 3, f.stockBags, 1)) * 100}%` }} title={`Alert at ${f.lowStockBags} bags`} />
              </div>
              <dl className="feed-card__figures">
                <div>
                  <dt>Alert at</dt>
                  <dd>{bags(f.lowStockBags)} bags</dd>
                </div>
                <div>
                  <dt>Daily use</dt>
                  <dd>{f.avgDailyBags ? `${bags(f.avgDailyBags)}/day` : '—'}</dd>
                </div>
                <div>
                  <dt>
                    <CalendarClock aria-hidden="true" /> Lasts
                  </dt>
                  <dd className={f.daysLeft !== null && f.daysLeft <= 7 ? 'is-bad' : ''}>{f.daysLeft !== null ? `~${f.daysLeft} days` : '—'}</dd>
                </div>
              </dl>
              <footer className="feed-card__actions">
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setModal({ kind: 'purchase', feed: f })}>
                  <ShoppingCart /> Bought
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModal({ kind: 'adjust', feed: f })}>
                  <ClipboardCheck /> Count
                </button>
                <button type="button" className="icon-btn" onClick={() => setModal({ kind: 'edit', feed: f })} aria-label={`Edit ${f.name}`}>
                  <Pencil />
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Wheat}
          title="No feeds in the store yet"
          text="Add each feed you buy (for example Broiler Starter, Grower, Finisher) with the bags you have now."
          action={
            <button type="button" className="btn btn--accent" onClick={() => setModal({ kind: 'new' })}>
              <Plus /> New feed
            </button>
          }
        />
      )}

      {feeds.length > 0 && (
        <section className="admin-card feed-ledger">
          <div className="admin-card__head">
            <h2>Feed ledger</h2>
            <div className="row row--wrap">
              <select className="select" value={ledgerFeed} onChange={(e) => { setLedgerFeed(e.target.value); setPage(1); }} aria-label="Feed">
                <option value="">All feeds</option>
                {feeds.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select className="select" value={ledgerType} onChange={(e) => { setLedgerType(e.target.value); setPage(1); }} aria-label="Entry type">
                <option value="">All entries</option>
                {Object.entries(FEED_TX).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <select className="select" value={ledgerFedTo} onChange={(e) => { setLedgerFedTo(e.target.value); setPage(1); }} aria-label="Fed to">
                <option value="">Fed to: anyone</option>
                {Object.entries(FED_TO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DataTable
            dense
            loading={ledger.loading}
            rows={ledger.data?.transactions}
            empty={{ icon: Wheat, title: 'No entries yet' }}
            columns={[
              { key: 'date', header: 'Date', render: (t) => formatDate(t.date) },
              { key: 'feedName', header: 'Feed', render: (t) => <span className="cell-title">{t.feedName}</span> },
              { key: 'type', header: 'Entry', render: (t) => <StatusBadge tone={FEED_TX[t.type]?.tone} size="sm">{FEED_TX[t.type]?.label}</StatusBadge> },
              { key: 'fedTo', header: 'Fed to', render: (t) => (t.type === 'USAGE' ? <FedTo t={t} /> : <span className="dash-muted">—</span>) },
              {
                key: 'detail',
                header: 'Details',
                hideOnMobile: true,
                render: (t) => (
                  <span className="feed-ledger__detail">
                    {[t.supplier, t.costPerBag ? `${formatCurrency(t.costPerBag)}/bag` : null, t.note].filter(Boolean).join(' · ')}
                    {t.byName ? <small> — {t.byName}</small> : null}
                  </span>
                ),
              },
              {
                key: 'qty',
                header: 'Bags',
                align: 'right',
                render: (t) => <strong className={`cell-number ${t.quantityBags < 0 ? 'feed-out' : 'feed-in'}`}>{t.quantityBags > 0 ? `+${bags(t.quantityBags)}` : `−${bags(-t.quantityBags)}`}</strong>,
              },
              { key: 'balanceAfter', header: 'Balance', align: 'right', render: (t) => <span className="cell-number">{bags(t.balanceAfter)}</span> },
            ]}
          />
          {ledger.data?.meta && <Pagination page={ledger.data.meta.page} pages={ledger.data.meta.pages} onChange={setPage} />}
        </section>
      )}

      <FeedFormModal open={modal?.kind === 'new' || modal?.kind === 'edit'} feed={modal?.kind === 'edit' ? modal.feed : null} onClose={close} onSaved={refresh} />
      <FeedPurchaseModal open={modal?.kind === 'purchase'} feed={modal?.feed} onClose={close} onSaved={refresh} />
      <FeedAdjustModal open={modal?.kind === 'adjust'} feed={modal?.feed} onClose={close} onSaved={refresh} />
      <FeedUsageModal open={modal?.kind === 'usage'} feeds={feeds} onClose={close} onSaved={refresh} />
    </>
  );
}
