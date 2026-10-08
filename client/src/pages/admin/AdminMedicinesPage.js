import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pill, AlertTriangle, ShoppingCart, ClipboardCheck, Pencil, Syringe, Wallet, CalendarX, ShieldAlert, Trash2, Package, Thermometer } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { MedicineFormModal, MedicinePurchaseModal, MedicineAdjustModal, MedicineDisposeModal, TreatmentModal } from '../../components/MedicineModals';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { MEDICINE_CATEGORIES, MEDICINE_TX, TREATMENT_PURPOSES, TREATMENT_ROUTES, DISPOSAL_REASONS, FED_TO, unitShort } from '../../utils/constants';
import { formatCurrency, formatDate } from '../../utils/format';
import './AdminFeedsPage.css'; // shared store layout (cards, gauge, ledger)
import './AdminMedicinesPage.css';

const qty = (n) => `${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const DAY_MS = 86400000;
const daysUntil = (date) => Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY_MS);

function GivenTo({ t }) {
  if (t.givenTo === 'BATCH' && t.batch) {
    return (
      <Link to={`/admin/batches/${t.batch}`} className="link">
        {t.batchCode}
      </Link>
    );
  }
  if (t.givenTo === 'STOCK') return <span>{t.productName ? `Stock · ${t.productName}` : 'All birds in stock'}</span>;
  if (t.givenTo === 'GROUP') return <span>{t.groupName}</span>;
  return <span>Whole farm</span>;
}

function StockBadge({ m }) {
  if (m.isExpired) return <StatusBadge tone="danger" size="sm">Expired</StatusBadge>;
  if (m.stockUnits <= 0) return <StatusBadge tone="danger" size="sm">Out</StatusBadge>;
  if (m.isLow) return <StatusBadge tone="danger" size="sm">Low</StatusBadge>;
  if (m.isExpiringSoon) return <StatusBadge tone="warning" size="sm">Expiring</StatusBadge>;
  return <StatusBadge tone="success" size="sm">OK</StatusBadge>;
}

// Gauge scale: full bar = 3× the alert level (or current stock if higher), so "low" sits at one third.
const scaleOf = (m) => Math.max(m.lowStockUnits * 3, m.stockUnits, 1);

const ledgerDetail = (t) => {
  if (t.type === 'USAGE') {
    return [
      TREATMENT_PURPOSES[t.purpose],
      t.condition,
      TREATMENT_ROUTES[t.route],
      t.dosage,
      t.birdsTreated ? `${t.birdsTreated} birds` : null,
      t.durationDays > 1 ? `${t.durationDays} days` : null,
      t.withdrawalUntil ? `safe to sell from ${formatDate(t.withdrawalUntil)}` : null,
      t.administeredBy ? `given by ${t.administeredBy}` : null,
      t.note,
    ];
  }
  if (t.type === 'PURCHASE' || t.type === 'OPENING') {
    return [t.supplier, t.costPerUnit ? `${formatCurrency(t.costPerUnit)}/unit` : null, t.lotNumber ? `lot ${t.lotNumber}` : null, t.expiryDate ? `exp. ${formatDate(t.expiryDate)}` : null, t.note];
  }
  if (t.type === 'DISPOSAL') return [DISPOSAL_REASONS[t.disposalReason], t.note];
  return [t.note];
};

export default function AdminMedicinesPage() {
  const [modal, setModal] = useState(null); // { kind, medicine }
  const [filters, setFilters] = useState({ medicine: '', type: '', givenTo: '', purpose: '' });
  const [page, setPage] = useState(1);
  const store = useFetch(() => adminService.listMedicines(), []);
  const ledger = useFetch(() => adminService.medicineTransactions({ ...filters, page, limit: 25 }), [filters, page]);
  const refresh = () => {
    store.reload();
    ledger.reload();
  };
  const filter = (changes) => {
    setFilters((f) => ({ ...f, ...changes }));
    setPage(1);
  };

  const s = store.data?.summary;
  const medicines = store.data?.medicines || [];
  const withdrawals = store.data?.withdrawals || [];
  const expired = medicines.filter((m) => m.isExpired);
  const problems = medicines.filter((m) => !m.isExpired && (m.isLow || m.isExpiringSoon));
  const close = () => setModal(null);

  return (
    <>
      <AdminPageHeader
        eyebrow="Livestock"
        title="Medicine Store"
        subtitle="Vaccines and medicines bought come in, treatments given to the birds go out. Every treatment is on record, birds on a withdrawal period are flagged, and the admin and the boss are alerted when a medicine runs low or nears expiry."
        actions={
          <>
            <button type="button" className="btn btn--outline" onClick={() => setModal({ kind: 'new' })}>
              <Plus /> New medicine
            </button>
            <button type="button" className="btn btn--accent" onClick={() => setModal({ kind: 'treat' })} disabled={!medicines.length}>
              <Syringe /> Record treatment
            </button>
          </>
        }
      />

      {expired.length > 0 && (
        <section className="med-expired" role="alert" aria-label="Expired drugs in store">
          <header>
            <CalendarX aria-hidden="true" />
            <div>
              <strong>{expired.length === 1 ? 'Expired drug in store — do not use' : `${expired.length} expired drugs in store — do not use`}</strong>
              <span>Expired medicine can fail to work or harm the birds. Remove it from the store and record the disposal; the alert repeats every week until you do.</span>
            </div>
          </header>
          <ul>
            {expired.map((m) => (
              <li key={m._id}>
                <span className="med-expired__name">{m.name}</span>
                <span>
                  {qty(m.stockUnits)} {unitShort(m.unit)} · expired {formatDate(m.expiryDate)} ({-m.daysToExpiry} day{m.daysToExpiry === -1 ? '' : 's'} ago)
                </span>
                <span className="med-expired__actions">
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => setModal({ kind: 'dispose', medicine: m })}>
                    <Trash2 /> Dispose
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModal({ kind: 'edit', medicine: m })} title="If a newer lot is in store, correct the expiry date">
                    <Pencil /> Fix date
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {problems.length > 0 && (
        <div className="feed-alert" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>{problems.length === 1 ? `${problems[0].name} needs attention` : `${problems.length} medicines need attention`}</strong>
            <span>
              {problems
                .map((m) =>
                  m.isLow
                      ? `${m.name}: ${qty(m.stockUnits)} ${unitShort(m.unit)} left`
                      : `${m.name}: expires in ${m.daysToExpiry} day(s)`
                )
                .join(' · ')}
            </span>
          </div>
        </div>
      )}

      {withdrawals.length > 0 && (
        <section className="med-withdrawal" aria-label="Birds on a withdrawal period">
          <header>
            <ShieldAlert aria-hidden="true" />
            <div>
              <strong>Birds on a withdrawal period — do not sell or slaughter yet</strong>
              <span>Medicine residues may still be in the meat or eggs until the date shown.</span>
            </div>
          </header>
          <ul>
            {withdrawals.map((w) => {
              const left = daysUntil(w.withdrawalUntil);
              return (
                <li key={`${w.givenTo}-${w.batch || w.product || w.groupName || 'farm'}`}>
                  <span className="med-withdrawal__who">
                    <GivenTo t={w} />
                  </span>
                  <span className="med-withdrawal__meds">{w.medicines.join(', ')}</span>
                  <span className="med-withdrawal__until">
                    Safe from <strong>{formatDate(w.withdrawalUntil)}</strong>
                    <small>{left === 1 ? 'tomorrow' : `in ${left} days`}</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="stats-grid feeds-stats">
        <AdminStatsCard tone="dark" icon={Package} label="Medicines in store" value={s?.items ?? '—'} hint={s ? `${s.lowItems} at or below alert level` : ''} />
        <AdminStatsCard
          tone={s?.expired ? 'red' : s?.expiringSoon ? 'amber' : 'green'}
          icon={CalendarX}
          label="Expired / expiring"
          value={s ? `${s.expired} / ${s.expiringSoon}` : '—'}
          hint="Expired · expiring within 30 days"
        />
        <AdminStatsCard icon={Syringe} label="Treatments (30 days)" value={s?.treatments30Days ?? '—'} hint={s ? `${s.underWithdrawal} group(s) on withdrawal now` : ''} />
        <AdminStatsCard tone="amber" icon={Wallet} label="Spent on medicine (30 days)" value={s ? formatCurrency(s.spent30Days) : '—'} hint="Purchases with a cost entered" />
      </div>

      {s && Object.keys(s.purposes30Days || {}).length > 0 && (
        <div className="feed-split" aria-label="Treatments in the last 30 days, by purpose">
          <span className="feed-split__title">Last 30 days</span>
          {Object.entries(TREATMENT_PURPOSES)
            .filter(([k]) => s.purposes30Days[k])
            .map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`feed-split__item ${filters.purpose === k ? 'is-active' : ''}`}
                onClick={() => filter({ purpose: filters.purpose === k ? '' : k, type: filters.purpose === k ? '' : 'USAGE' })}
                title="Show these treatments in the ledger"
              >
                {label} <strong>{s.purposes30Days[k]}</strong>
              </button>
            ))}
        </div>
      )}

      {store.error ? (
        <ErrorState message={store.error} onRetry={store.reload} />
      ) : store.loading ? (
        <div className="feed-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 240 }} />
          ))}
        </div>
      ) : medicines.length ? (
        <div className="feed-grid">
          {medicines.map((m) => {
            const u = unitShort(m.unit);
            return (
              <article key={m._id} className={`feed-card med-card ${m.isLow || m.isExpired ? 'is-low' : ''} ${m.isExpiringSoon ? 'is-expiring' : ''}`}>
                <header className="feed-card__head">
                  <div>
                    <h3>{m.name}</h3>
                    <span>{[MEDICINE_CATEGORIES[m.category], m.brand, m.unitSize ? `${m.unitSize} per ${u.replace('(s)', '')}` : null].filter(Boolean).join(' · ')}</span>
                  </div>
                  <StockBadge m={m} />
                </header>

                <div className="feed-card__stock">
                  <strong>{qty(m.stockUnits)}</strong>
                  <span>{u} in store</span>
                </div>
                <div className="feed-gauge" aria-label={`${m.stockUnits} ${u}; alert at ${m.lowStockUnits}`}>
                  <span className="feed-gauge__fill" style={{ width: `${Math.min((m.stockUnits / scaleOf(m)) * 100, 100)}%` }} />
                  <span className="feed-gauge__mark" style={{ left: `${(m.lowStockUnits / scaleOf(m)) * 100}%` }} title={`Alert at ${m.lowStockUnits} ${u}`} />
                </div>
                <dl className="feed-card__figures">
                  <div>
                    <dt>Alert at</dt>
                    <dd>{qty(m.lowStockUnits)}</dd>
                  </div>
                  <div>
                    <dt>Withdrawal</dt>
                    <dd>{m.withdrawalDays ? `${m.withdrawalDays} days` : 'None'}</dd>
                  </div>
                  <div>
                    <dt>
                      <CalendarX aria-hidden="true" /> Expires
                    </dt>
                    <dd className={m.isExpired || m.isExpiringSoon ? 'is-bad' : ''} title={m.expiryDate ? formatDate(m.expiryDate) : undefined}>
                      {m.expiryDate ? (m.isExpired ? 'Expired' : m.daysToExpiry <= 60 ? `${m.daysToExpiry} days` : formatDate(m.expiryDate, { month: 'short', year: 'numeric' })) : '—'}
                    </dd>
                  </div>
                </dl>
                {m.storage && (
                  <p className="med-card__storage">
                    <Thermometer aria-hidden="true" /> {m.storage}
                  </p>
                )}
                <footer className="feed-card__actions">
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => setModal({ kind: 'purchase', medicine: m })}>
                    <ShoppingCart /> Bought
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setModal({ kind: 'adjust', medicine: m })}>
                    <ClipboardCheck /> Count
                  </button>
                  <button
                    type="button"
                    className={`btn btn--sm ${m.isExpired ? 'btn--danger' : 'btn--ghost'}`}
                    onClick={() => setModal({ kind: 'dispose', medicine: m })}
                    disabled={m.stockUnits <= 0}
                    title="Record expired or damaged stock thrown away"
                  >
                    <Trash2 /> Dispose
                  </button>
                  <button type="button" className="icon-btn" onClick={() => setModal({ kind: 'edit', medicine: m })} aria-label={`Edit ${m.name}`}>
                    <Pencil />
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Pill}
          title="No medicines in the store yet"
          text="Add each vaccine, medicine or supplement you keep (for example Gumboro vaccine, Lasota, Amoxicillin, multivitamin) with the quantity you have now."
          action={
            <button type="button" className="btn btn--accent" onClick={() => setModal({ kind: 'new' })}>
              <Plus /> New medicine
            </button>
          }
        />
      )}

      {medicines.length > 0 && (
        <section className="admin-card feed-ledger">
          <div className="admin-card__head">
            <h2>Treatments &amp; stock ledger</h2>
            <div className="row row--wrap">
              <select className="select" value={filters.medicine} onChange={(e) => filter({ medicine: e.target.value })} aria-label="Medicine">
                <option value="">All medicines</option>
                {medicines.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select className="select" value={filters.type} onChange={(e) => filter({ type: e.target.value })} aria-label="Entry type">
                <option value="">All entries</option>
                {Object.entries(MEDICINE_TX).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <select className="select" value={filters.givenTo} onChange={(e) => filter({ givenTo: e.target.value })} aria-label="Given to">
                <option value="">Given to: anyone</option>
                {Object.entries(FED_TO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <select className="select" value={filters.purpose} onChange={(e) => filter({ purpose: e.target.value })} aria-label="Purpose">
                <option value="">Any purpose</option>
                {Object.entries(TREATMENT_PURPOSES).map(([k, v]) => (
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
            empty={{ icon: Pill, title: 'No entries yet' }}
            columns={[
              { key: 'date', header: 'Date', render: (t) => formatDate(t.date) },
              { key: 'medicineName', header: 'Medicine', render: (t) => <span className="cell-title">{t.medicineName}</span> },
              { key: 'type', header: 'Entry', render: (t) => <StatusBadge tone={MEDICINE_TX[t.type]?.tone} size="sm">{MEDICINE_TX[t.type]?.label}</StatusBadge> },
              { key: 'givenTo', header: 'Given to', render: (t) => (t.type === 'USAGE' ? <GivenTo t={t} /> : <span className="dash-muted">—</span>) },
              {
                key: 'detail',
                header: 'Details',
                hideOnMobile: true,
                render: (t) => (
                  <span className="feed-ledger__detail">
                    {ledgerDetail(t).filter(Boolean).join(' · ')}
                    {t.byName ? <small> — {t.byName}</small> : null}
                  </span>
                ),
              },
              {
                key: 'qty',
                header: 'Qty',
                align: 'right',
                render: (t) => (
                  <strong className={`cell-number ${t.quantity < 0 ? 'feed-out' : 'feed-in'}`} title={unitShort(t.unit)}>
                    {t.quantity > 0 ? `+${qty(t.quantity)}` : `−${qty(-t.quantity)}`}
                  </strong>
                ),
              },
              { key: 'balanceAfter', header: 'Balance', align: 'right', render: (t) => <span className="cell-number">{qty(t.balanceAfter)}</span> },
            ]}
          />
          {ledger.data?.meta && <Pagination page={ledger.data.meta.page} pages={ledger.data.meta.pages} onChange={setPage} />}
        </section>
      )}

      <MedicineFormModal open={modal?.kind === 'new' || modal?.kind === 'edit'} medicine={modal?.kind === 'edit' ? modal.medicine : null} onClose={close} onSaved={refresh} />
      <MedicinePurchaseModal open={modal?.kind === 'purchase'} medicine={modal?.medicine} onClose={close} onSaved={refresh} />
      <MedicineAdjustModal open={modal?.kind === 'adjust'} medicine={modal?.medicine} onClose={close} onSaved={refresh} />
      <MedicineDisposeModal open={modal?.kind === 'dispose'} medicine={modal?.medicine} onClose={close} onSaved={refresh} />
      <TreatmentModal open={modal?.kind === 'treat'} medicines={medicines} onClose={close} onSaved={refresh} />
    </>
  );
}
