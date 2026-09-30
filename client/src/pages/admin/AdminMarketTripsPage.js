import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Truck, Store, Wallet, PackageCheck, Search, ArrowRightLeft } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import NewMarketTripModal from '../../components/NewMarketTripModal';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { formatCurrency, formatDate } from '../../utils/format';
import { TRIP_STATUS } from '../../utils/constants';
import './AdminMarketTripsPage.css';

export default function AdminMarketTripsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const q = useDebounce(search);
  const { data, loading, error, reload } = useFetch(() => adminService.listMarketTrips({ status, q, page, limit: 20 }), [status, q, page]);
  const summary = data?.summary;
  const month = summary?.last30Days;

  return (
    <>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Market Trips"
        subtitle="Birds and eggs taken to market leave stock when they go. When the trip returns, record what was sold, brought back or lost so inventory stays balanced."
        actions={
          <button type="button" className="btn btn--accent" onClick={() => setCreating(true)}>
            <Plus /> Send to Market
          </button>
        }
      />

      <ol className="trip-flow" aria-label="How market trips work">
        <li>
          <span>1</span>
          <div>
            <strong>Send to market</strong>
            <small>Quantities leave stock immediately</small>
          </div>
        </li>
        <li>
          <span>2</span>
          <div>
            <strong>Sell at market</strong>
            <small>Trip shows as “At market”</small>
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            <strong>Close the trip</strong>
            <small>Sold + returned + lost = taken out · returns go back to stock</small>
          </div>
        </li>
      </ol>

      <div className="stats-grid trips-stats">
        <AdminStatsCard tone="amber" icon={Truck} label="Trips at market" value={summary?.openTrips ?? '—'} hint="Still to be closed" />
        <AdminStatsCard icon={Store} label="Units at market" value={summary?.unitsAtMarket ?? '—'} hint="Off the farm right now" />
        <AdminStatsCard tone="dark" icon={Wallet} label="Market sales" value={month ? formatCurrency(month.sales) : '—'} hint="Closed trips, last 30 days" />
        <AdminStatsCard
          icon={PackageCheck}
          label="Sold at market"
          value={month ? `${month.sellThrough}%` : '—'}
          hint={month ? `${month.sold} sold · ${month.returned} returned · ${month.lost} lost (30 days)` : ''}
        />
      </div>

      <div className="admin-toolbar">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input
            className="input"
            type="search"
            placeholder="Trip number, market, person or product…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Trip status"
        >
          <option value="">All trips</option>
          <option value="OUT">At market</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            loading={loading}
            rows={data?.trips}
            onRowClick={(t) => navigate(`/admin/market-trips/${t._id}`)}
            empty={{
              icon: ArrowRightLeft,
              title: 'No market trips yet',
              text: 'When birds or eggs go to market, record the trip here so stock stays accurate.',
              action: (
                <button type="button" className="btn btn--accent" onClick={() => setCreating(true)}>
                  <Plus /> Send to Market
                </button>
              ),
            }}
            columns={[
              {
                key: 'tripNumber',
                header: 'Trip',
                render: (t) => (
                  <div>
                    <span className="cell-title">{t.tripNumber}</span>
                    <span className="cell-sub">{formatDate(t.tripDate)}</span>
                  </div>
                ),
              },
              {
                key: 'market',
                header: 'Market',
                render: (t) => (
                  <div>
                    <span className="cell-title">{t.market}</span>
                    <span className="cell-sub">{t.responsiblePerson || '—'}</span>
                  </div>
                ),
              },
              {
                key: 'items',
                header: 'Products',
                hideOnMobile: true,
                render: (t) => (
                  <span className="trips-products">
                    {t.items.map((i) => `${i.productName}${i.variantLabel ? ` (${i.variantLabel})` : ''}`).join(', ')}
                  </span>
                ),
              },
              { key: 'out', header: 'Out', align: 'right', render: (t) => <span className="cell-number">{t.totals.out}</span> },
              {
                key: 'result',
                header: 'Sold / Back / Lost',
                align: 'right',
                render: (t) =>
                  t.status === 'CLOSED' ? (
                    <span className="cell-number trips-result">
                      <b className="is-sold">{t.totals.sold}</b> / <b className="is-back">{t.totals.returned}</b> / <b className="is-lost">{t.totals.lost}</b>
                    </span>
                  ) : (
                    <span className="cell-sub">—</span>
                  ),
              },
              {
                key: 'sales',
                header: 'Sales',
                align: 'right',
                render: (t) => (t.status === 'CLOSED' ? <strong className="cell-number">{formatCurrency(t.totals.salesAmount)}</strong> : '—'),
              },
              { key: 'status', header: 'Status', render: (t) => <StatusBadge tone={TRIP_STATUS[t.status].tone} size="sm">{TRIP_STATUS[t.status].label}</StatusBadge> },
            ]}
          />
          {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />}
        </>
      )}

      <NewMarketTripModal open={creating} onClose={() => setCreating(false)} onCreated={(trip) => navigate(`/admin/market-trips/${trip._id}`)} />
    </>
  );
}
