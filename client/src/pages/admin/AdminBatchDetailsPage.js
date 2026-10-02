import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, PackagePlus, HeartCrack, Scale, Lock, BellRing, Wheat, Beef } from 'lucide-react';
import { FeedUsageModal } from '../../components/FeedModals';
import AdminPageHeader from '../../components/AdminPageHeader';
import StatusBadge from '../../components/StatusBadge';
import BatchStageBar from '../../components/BatchStageBar';
import BatchFormModal from '../../components/BatchFormModal';
import MoveToStockModal from '../../components/MoveToStockModal';
import PushToInventoryButton from '../../components/PushToInventoryButton';
import ProcessingRunModal from '../../components/ProcessingRunModal';
import BarChart from '../../components/BarChart';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { BATCH_STAGES, LOSS_REASONS, lossReasonsFor } from '../../utils/constants';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import './AdminBatchDetailsPage.css';

const today = () => new Date().toISOString().slice(0, 10);
const byDateDesc = (list = []) => [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

export default function AdminBatchDetailsPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: batch, loading, error, reload, setData } = useFetch(() => adminService.getBatch(id), [id]);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [death, setDeath] = useState({ quantity: '', reason: 'MORTALITY', date: today(), note: '' });
  const [weigh, setWeigh] = useState({ avgWeightKg: '', sampleSize: '', date: today(), note: '' });
  const [busy, setBusy] = useState('');
  const [feeding, setFeeding] = useState(false);
  const [processing, setProcessing] = useState(false);
  const feedUsage = useFetch(() => adminService.batchFeedUsage(id), [id]);
  const feedStore = useFetch(() => adminService.listFeeds(), []);

  if (loading) return <PageLoader label="Loading batch…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const stage = BATCH_STAGES[batch.stage];
  const open = ['ACTIVE', 'READY'].includes(batch.status);
  const weighings = [...batch.weighings].sort((a, b) => new Date(a.date) - new Date(b.date));
  const DAY_MS = 86400000;
  const ageOn = (date) =>
    (batch.ageAtPurchaseDays || 1) + Math.max(Math.floor((new Date(date).setHours(0, 0, 0, 0) - new Date(batch.purchaseDate).setHours(0, 0, 0, 0)) / DAY_MS), 0);

  const submit = async (key, fn, reset) => {
    setBusy(key);
    try {
      const result = await fn();
      toast.success(result.message);
      setData(result.batch);
      reset?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const recordDeath = (e) => {
    e.preventDefault();
    submit('death', () => adminService.recordBatchMortality(batch._id, death), () => setDeath({ quantity: '', reason: 'MORTALITY', date: today(), note: '' }));
  };
  const recordWeighing = (e) => {
    e.preventDefault();
    submit('weigh', () => adminService.recordBatchWeighing(batch._id, weigh), () => setWeigh({ avgWeightKg: '', sampleSize: '', date: today(), note: '' }));
  };
  const closeBatch = () =>
    submit('close', () => adminService.closeBatch(batch._id, closeReason), () => {
      setClosing(false);
      setCloseReason('');
    });

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/batches', label: 'Flock Batches' }}
        eyebrow={`${batch.categoryName}${batch.breed ? ` · ${batch.breed}` : ''}${batch.house ? ` · ${batch.house}` : ''}`}
        title={batch.batchCode}
        actions={
          <div className="row row--wrap">
            <StatusBadge tone={stage.tone}>{stage.label}</StatusBadge>
            <PushToInventoryButton batch={batch} onClick={() => setMoving(true)} />
            {open && batch.stage === 'READY' && batch.live > 0 && (
              <button type="button" className="btn btn--outline btn--sm" onClick={() => setProcessing(true)}>
                <Beef /> Process into meat
              </button>
            )}
            {open && (
              <>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setClosing(true)}>
                  <Lock /> Close batch
                </button>
              </>
            )}
          </div>
        }
      />

      {batch.status === 'READY' && (
        <div className="batch-ready">
          <BellRing aria-hidden="true" />
          <div>
            <strong>This batch has reached {batch.targetAgeDays} days and is ready for sale.</strong>
            <span>
              {batch.live} live bird{batch.live === 1 ? '' : 's'} waiting. Push them to main inventory to put them on sale — all at once or in parts.
            </span>
          </div>
          <button type="button" className="btn btn--accent" onClick={() => setMoving(true)}>
            <PackagePlus /> Push to main inventory
          </button>
        </div>
      )}

      <section className="admin-card batch-overview">
        <div className="batch-overview__age">
          <span>Age today</span>
          <strong>Day {batch.ageDays}</strong>
          <small>
            Week {batch.ageWeeks} · arrived {formatDate(batch.purchaseDate)} at {batch.ageAtPurchaseDays} day{batch.ageAtPurchaseDays === 1 ? '' : 's'} old
          </small>
        </div>
        <div className="batch-overview__progress">
          <div className="batch-overview__progress-head">
            <span>
              {batch.stage === 'IN_STOCK' || batch.stage === 'CLOSED'
                ? stage.label
                : batch.daysToReady
                ? `${batch.daysToReady} day${batch.daysToReady === 1 ? '' : 's'} to target · ready ${formatDate(batch.readyDate)}`
                : 'Target age reached'}
            </span>
            <strong>{batch.progress}%</strong>
          </div>
          <BatchStageBar batch={batch} />
        </div>
      </section>

      <dl className="batch-figures">
        <div>
          <dt>Arrived</dt>
          <dd>{batch.quantityPurchased}</dd>
        </div>
        <div className="is-live">
          <dt>Live now</dt>
          <dd>{batch.live}</dd>
        </div>
        <div className="is-bad">
          <dt>Deaths</dt>
          <dd>
            {batch.deaths} <small>{batch.mortalityRate}%</small>
          </dd>
        </div>
        <div>
          <dt>Moved to stock</dt>
          <dd>{batch.transferred}</dd>
        </div>
        {batch.processed > 0 && (
          <div>
            <dt>Processed into meat</dt>
            <dd>
              {batch.processed}
              <small className="batch-runs">
                {(batch.processedRuns || []).map((p) => (
                  <Link key={p._id} to={`/admin/processing/${p.run}`} className="link">
                    {p.runNumber}
                  </Link>
                ))}
              </small>
            </dd>
          </div>
        )}
        <div>
          <dt>Latest avg weight</dt>
          <dd>
            {batch.latestWeightKg ? `${batch.latestWeightKg} kg` : '—'}
            {batch.targetWeightKg ? <small>target {batch.targetWeightKg} kg</small> : null}
          </dd>
        </div>
        <div>
          <dt>Cost</dt>
          <dd>
            {batch.totalCost !== null ? formatCurrency(batch.totalCost) : '—'}
            {batch.unitCost ? <small>{formatCurrency(batch.unitCost)}/bird</small> : null}
          </dd>
        </div>
      </dl>

      <div className="batch-grid-2">
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Growth</h2>
            <span className="text-muted batch-small">Average weight by weigh-in (kg)</span>
          </div>
          <div className="admin-card__body">
            <BarChart
              data={weighings.map((w) => ({ label: `D${ageOn(w.date)}`, value: w.avgWeightKg }))}
              formatValue={(v) => `${v} kg`}
              height={200}
              emptyText="No weigh-ins yet — record one to start the growth chart"
            />
          </div>
        </section>

        {open ? (
          <div className="batch-forms">
            <form className="admin-card batch-form" onSubmit={recordWeighing}>
              <div className="admin-card__head">
                <h2>
                  <Scale aria-hidden="true" /> Record weigh-in
                </h2>
              </div>
              <div className="admin-card__body form-grid form-grid--3">
                <FormField label="Avg weight (kg)" required>
                  <input className="input" type="number" min="0" step="0.01" value={weigh.avgWeightKg} onChange={(e) => setWeigh({ ...weigh, avgWeightKg: e.target.value })} />
                </FormField>
                <FormField label="Birds weighed">
                  <input className="input" type="number" min="1" value={weigh.sampleSize} onChange={(e) => setWeigh({ ...weigh, sampleSize: e.target.value })} />
                </FormField>
                <FormField label="Date">
                  <input className="input" type="date" max={today()} value={weigh.date} onChange={(e) => setWeigh({ ...weigh, date: e.target.value })} />
                </FormField>
                <button type="submit" className="btn btn--primary btn--sm span-all" disabled={busy === 'weigh' || !weigh.avgWeightKg}>
                  {busy === 'weigh' && <span className="spinner" />} Save weigh-in
                </button>
              </div>
            </form>

            <form className="admin-card batch-form" onSubmit={recordDeath}>
              <div className="admin-card__head">
                <h2>
                  <HeartCrack aria-hidden="true" /> Record deaths
                </h2>
                <span className="text-muted batch-small">Adjusts this batch only — shop stock is not affected</span>
              </div>
              <div className="admin-card__body form-grid form-grid--3">
                <FormField label="Number of birds" required>
                  <input className="input" type="number" min="1" max={batch.live} value={death.quantity} onChange={(e) => setDeath({ ...death, quantity: e.target.value })} />
                </FormField>
                <FormField label="Reason">
                  <select className="select" value={death.reason} onChange={(e) => setDeath({ ...death, reason: e.target.value })}>
                    {lossReasonsFor(batch.categorySlug).map(([code, r]) => (
                      <option key={code} value={code}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Date">
                  <input className="input" type="date" max={today()} value={death.date} onChange={(e) => setDeath({ ...death, date: e.target.value })} />
                </FormField>
                <FormField label="Note" className="span-2">
                  <input className="input" value={death.note} onChange={(e) => setDeath({ ...death, note: e.target.value })} maxLength={500} placeholder="Symptoms, vet advice…" />
                </FormField>
                <button type="submit" className="btn btn--danger btn--sm batch-form__submit" disabled={busy === 'death' || !death.quantity}>
                  {busy === 'death' && <span className="spinner" />} Record deaths
                </button>
              </div>
            </form>
          </div>
        ) : (
          <section className="admin-card">
            <div className="admin-card__body batch-closed">
              <Lock aria-hidden="true" />
              <div>
                <strong>{batch.status === 'COMPLETED' ? `All birds were moved to stock on ${formatDate(batch.completedAt)}.` : `Batch closed ${formatDate(batch.closedAt)}.`}</strong>
                {batch.closeReason && <p className="text-muted">{batch.closeReason}</p>}
                <p className="text-muted">The records below are kept for reporting.</p>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="batch-grid-3">
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Moved to stock</h2>
          </div>
          <table className="batch-log">
            <tbody>
              {batch.transfers.length ? (
                byDateDesc(batch.transfers).map((t) => (
                  <tr key={t._id}>
                    <td>
                      <strong>
                        {t.productName}
                        {t.variantLabel ? ` · ${t.variantLabel}` : ''}
                      </strong>
                      <small>
                        {formatDateTime(t.date)} · {t.byName}
                      </small>
                    </td>
                    <td className="num is-good">+{t.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="batch-log__empty">Nothing moved to stock yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Deaths</h2>
          </div>
          <table className="batch-log">
            <tbody>
              {batch.mortality.length ? (
                byDateDesc(batch.mortality).map((m) => (
                  <tr key={m._id}>
                    <td>
                      <strong>{LOSS_REASONS[m.reason]?.label || m.reason}</strong>
                      <small>
                        {formatDate(m.date)} · day {ageOn(m.date)}
                        {m.note ? ` · ${m.note}` : ''}
                      </small>
                    </td>
                    <td className="num is-bad">−{m.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="batch-log__empty">No deaths recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Weigh-ins</h2>
          </div>
          <table className="batch-log">
            <tbody>
              {batch.weighings.length ? (
                byDateDesc(batch.weighings).map((w) => (
                  <tr key={w._id}>
                    <td>
                      <strong>
                        Day {ageOn(w.date)} · {formatDate(w.date)}
                      </strong>
                      <small>{w.sampleSize ? `${w.sampleSize} birds weighed` : 'Sample size not recorded'}</small>
                    </td>
                    <td className="num">{w.avgWeightKg} kg</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="batch-log__empty">No weigh-ins yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-card batch-feed">
        <div className="admin-card__head">
          <h2>
            <Wheat aria-hidden="true" /> Feed eaten
          </h2>
          {open && (
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setFeeding(true)} disabled={!feedStore.data?.feeds?.length}>
              Record feeding
            </button>
          )}
        </div>
        <div className="admin-card__body">
          {feedUsage.data?.feeds?.length ? (
            <div className="batch-feed__grid">
              <div className="batch-feed__total">
                <strong>{feedUsage.data.totalBags}</strong>
                <span>bags in total</span>
                {batch.quantityPurchased > 0 && <small>{Math.round((feedUsage.data.totalBags / batch.quantityPurchased) * 1000) / 10} bags per 100 birds arrived</small>}
              </div>
              <ul>
                {feedUsage.data.feeds.map((f) => (
                  <li key={f.feedId}>
                    <span>{f.feedName}</span>
                    <strong>{f.bags} bags</strong>
                    <small>last {formatDate(f.lastDate)}</small>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-muted batch-small">
              No feed has been charged to this batch yet. Use <strong>Record daily feeding</strong> in the Feed Store (or the button here) and choose this batch.
            </p>
          )}
        </div>
      </section>

      <section className="admin-card batch-details">
        <dl>
          <div>
            <dt>Supplier</dt>
            <dd>{batch.supplier || '—'}</dd>
          </div>
          <div>
            <dt>Breed / strain</dt>
            <dd>{batch.breed || '—'}</dd>
          </div>
          <div>
            <dt>House / pen</dt>
            <dd>{batch.house || '—'}</dd>
          </div>
          <div>
            <dt>Sell at</dt>
            <dd>
              {batch.targetAgeDays} days{batch.targetWeightKg ? ` · ${batch.targetWeightKg} kg` : ''}
            </dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>
              {formatDateTime(batch.createdAt)}
              {batch.createdByName ? ` by ${batch.createdByName}` : ''}
            </dd>
          </div>
          {batch.readyAt && (
            <div>
              <dt>Became ready</dt>
              <dd>{formatDateTime(batch.readyAt)}</dd>
            </div>
          )}
        </dl>
        {batch.notes && <p className="batch-notes">“{batch.notes}”</p>}
      </section>

      <BatchFormModal open={editing} batch={batch} onClose={() => setEditing(false)} onSaved={setData} />
      <MoveToStockModal open={moving} batch={batch} onClose={() => setMoving(false)} onDone={setData} />
      <ProcessingRunModal open={processing} presetBatchId={batch._id} onClose={() => setProcessing(false)} onCreated={() => reload()} />
      <FeedUsageModal
        open={feeding}
        feeds={feedStore.data?.feeds || []}
        presetBatchId={batch._id}
        onClose={() => setFeeding(false)}
        onSaved={() => {
          feedUsage.reload();
          feedStore.reload();
        }}
      />
      <Modal
        open={closing}
        onClose={() => setClosing(false)}
        title={`Close ${batch.batchCode}?`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setClosing(false)}>
              Back
            </button>
            <button type="button" className="btn btn--danger" onClick={closeBatch} disabled={busy === 'close'}>
              {busy === 'close' && <span className="spinner" />} Close batch
            </button>
          </>
        }
      >
        <div className="stack">
          <p className="text-muted">
            Closing stops tracking this batch. {batch.live > 0 ? `Its ${batch.live} live bird(s) will NOT be added to stock — move them to stock first if they are for sale.` : ''}
          </p>
          <FormField label="Reason">
            <input className="input" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} maxLength={500} placeholder="e.g. Sold directly to a buyer at the farm" />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
