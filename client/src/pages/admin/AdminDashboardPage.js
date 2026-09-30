import { Link, useNavigate } from 'react-router-dom';
import {
  Package, ShoppingBag, Users, Wallet, Clock, CheckCircle2, AlertTriangle, PackageX, Plus, Building2, Mail, ArrowRight, Skull, Egg, Receipt, Truck, Store, Bird, BellRing, Wheat,
} from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import DataTable from '../../components/DataTable';
import BarChart from '../../components/BarChart';
import StatusBadge from '../../components/StatusBadge';
import SmartImage from '../../components/SmartImage';
import EmptyState from '../../components/EmptyState';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { compactNumber, formatCurrency, formatDate, humanize } from '../../utils/format';
import './AdminDashboardPage.css';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch(() => adminService.dashboard(), []);

  if (loading) return <PageLoader label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { stats, salesSeries, ordersByStatus, recentOrders, recentCustomers, lowStock, outOfStock } = data;
  const maxStatus = Math.max(...ordersByStatus.map((s) => s.count), 1);
  const periodSales = salesSeries.reduce((s, m) => s + m.sales, 0);
  const periodOrders = salesSeries.reduce((s, m) => s + m.orders, 0);

  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title="Farm Dashboard"
        subtitle={`Live figures from your store · ${formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <>
            <Link to="/admin/orders" className="btn btn--outline">
              View Orders
            </Link>
            <Link to="/admin/products/new" className="btn btn--accent">
              <Plus /> Add Product
            </Link>
          </>
        }
      />

      {(stats.newBulkRequests > 0 || stats.newMessages > 0 || stats.receiptsToReview > 0 || stats.batchesReady > 0 || stats.lowFeeds?.length > 0) && (
        <div className="dash-alerts">
          {stats.lowFeeds?.length > 0 && (
            <Link to="/admin/feeds" className="dash-alert dash-alert--danger">
              <Wheat aria-hidden="true" /> Low feed: {stats.lowFeeds.map((f) => `${f.name} (${f.stockBags} bags)`).join(', ')} <ArrowRight />
            </Link>
          )}
          {stats.batchesReady > 0 && (
            <Link to="/admin/batches?status=READY" className="dash-alert">
              <Bird aria-hidden="true" /> {stats.batchesReady} flock batch{stats.batchesReady === 1 ? ' is' : 'es are'} ready for sale <ArrowRight />
            </Link>
          )}
          {stats.receiptsToReview > 0 && (
            <Link to="/admin/orders?awaitingReview=true" className="dash-alert dash-alert--info">
              <Receipt aria-hidden="true" /> {stats.receiptsToReview} payment receipt{stats.receiptsToReview === 1 ? '' : 's'} to confirm <ArrowRight />
            </Link>
          )}
          {stats.newBulkRequests > 0 && (
            <Link to="/admin/bulk-orders" className="dash-alert">
              <Building2 aria-hidden="true" /> {stats.newBulkRequests} new bulk order request{stats.newBulkRequests === 1 ? '' : 's'} <ArrowRight />
            </Link>
          )}
          {stats.newMessages > 0 && (
            <Link to="/admin/messages" className="dash-alert">
              <Mail aria-hidden="true" /> {stats.newMessages} unread message{stats.newMessages === 1 ? '' : 's'} <ArrowRight />
            </Link>
          )}
        </div>
      )}

      <div className="stats-grid">
        <AdminStatsCard tone="dark" icon={Wallet} label="Total Sales" value={formatCurrency(stats.totalSales)} hint="Paid orders, all time" />
        <AdminStatsCard icon={ShoppingBag} label="Total Orders" value={compactNumber(stats.totalOrders)} to="/admin/orders" />
        <AdminStatsCard icon={Users} label="Customers" value={compactNumber(stats.totalCustomers)} to="/admin/customers" />
        <AdminStatsCard icon={Package} label="Products" value={compactNumber(stats.totalProducts)} to="/admin/products" />
        <AdminStatsCard tone="amber" icon={Clock} label="Pending Orders" value={stats.pendingOrders} to="/admin/orders?status=PENDING" />
        <AdminStatsCard icon={CheckCircle2} label="Completed Orders" value={stats.completedOrders} to="/admin/orders?status=COMPLETED" />
        <AdminStatsCard tone="amber" icon={AlertTriangle} label="Low Stock" value={stats.lowStockCount} to="/admin/inventory?status=low_stock" />
        <AdminStatsCard tone="red" icon={PackageX} label="Out of Stock" value={stats.outOfStockCount} to="/admin/inventory?status=out_of_stock" />
        <AdminStatsCard tone="red" icon={Skull} label="Birds Lost (30 days)" value={stats.birdLosses30d} to="/admin/losses" hint="Deaths, disease, culls" />
        <AdminStatsCard
          tone={stats.lowFeeds?.length ? 'red' : 'green'}
          icon={Wheat}
          label="Feed in Store"
          value={`${stats.feedBags ?? 0} bags`}
          to="/admin/feeds"
          hint={stats.lowFeeds?.length ? `${stats.lowFeeds.length} feed(s) low` : 'All feeds above alert level'}
        />
        <AdminStatsCard icon={Bird} label="Birds Growing" value={stats.birdsGrowing} to="/admin/batches" hint="In flock batches, not yet in stock" />
        <AdminStatsCard tone="amber" icon={BellRing} label="Batches Ready" value={stats.batchesReady} to="/admin/batches?status=READY" hint="Waiting for confirmation" />
        <AdminStatsCard icon={Truck} label="At Market Now" value={stats.unitsAtMarket} to="/admin/market-trips?status=OUT" hint="Birds & eggs off the farm" />
        <AdminStatsCard tone="dark" icon={Store} label="Market Sales (30 days)" value={formatCurrency(stats.marketSales30d)} to="/admin/market-trips" />
        <AdminStatsCard tone="amber" icon={Egg} label="Eggs Lost (30 days)" value={stats.eggLosses30d} to="/admin/losses" hint="Broken or spoiled packs" />
      </div>

      <div className="dash-grid dash-grid--charts">
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Sales Analytics</h2>
            <span className="dash-muted">Last 6 months · {formatCurrency(periodSales)}</span>
          </div>
          <div className="admin-card__body">
            <BarChart data={salesSeries.map((m) => ({ label: m.label, value: m.sales }))} formatValue={(v) => `₦${compactNumber(v)}`} height={220} emptyText="No paid orders in the last 6 months" />
          </div>
        </section>
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Order Analytics</h2>
            <span className="dash-muted">Last 6 months · {periodOrders} orders</span>
          </div>
          <div className="admin-card__body">
            <BarChart data={salesSeries.map((m) => ({ label: m.label, value: m.orders }))} tone="amber" height={220} emptyText="No orders in the last 6 months" />
          </div>
        </section>
      </div>

      <div className="dash-grid dash-grid--main">
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Recent Orders</h2>
            <Link to="/admin/orders" className="link">
              View all
            </Link>
          </div>
          <DataTable
            dense
            rows={recentOrders}
            onRowClick={(row) => navigate(`/admin/orders/${row._id}`)}
            empty={{ title: 'No orders yet', text: 'New orders will appear here as soon as customers check out.', icon: ShoppingBag }}
            columns={[
              { key: 'orderNumber', header: 'Order', render: (r) => <span className="cell-title">{r.orderNumber}</span> },
              { key: 'customer', header: 'Customer', render: (r) => r.customer.fullName },
              { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="cell-number">{formatCurrency(r.total)}</span> },
              { key: 'orderStatus', header: 'Status', render: (r) => <StatusBadge status={r.orderStatus} size="sm" /> },
              { key: 'createdAt', header: 'Date', hideOnMobile: true, render: (r) => formatDate(r.createdAt) },
            ]}
          />
        </section>

        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Orders by Status</h2>
          </div>
          <div className="admin-card__body dash-status">
            {ordersByStatus.map((s) => (
              <Link key={s.status} to={`/admin/orders?status=${s.status}`} className="dash-status__row">
                <span>{humanize(s.status)}</span>
                <span className="dash-status__track">
                  <span className={`dash-status__bar dash-status__bar--${s.status.toLowerCase()}`} style={{ width: `${(s.count / maxStatus) * 100}%` }} />
                </span>
                <strong>{s.count}</strong>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="dash-grid dash-grid--three">
        <StockList title="Low Stock" items={lowStock} tone="low_stock" empty="No products are running low." />
        <StockList title="Out of Stock" items={outOfStock} tone="out_of_stock" empty="Everything active is in stock." />
        <section className="admin-card">
          <div className="admin-card__head">
            <h2>Recent Customers</h2>
            <Link to="/admin/customers" className="link">
              View all
            </Link>
          </div>
          <div className="admin-card__body">
            {recentCustomers.length ? (
              <ul className="dash-list">
                {recentCustomers.map((c) => (
                  <li key={c._id}>
                    <Link to={`/admin/customers/${c._id}`} className="dash-list__row">
                      <span className="admin-avatar dash-list__avatar">{c.name.charAt(0).toUpperCase()}</span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>{c.email}</small>
                      </span>
                      <small>{formatDate(c.createdAt)}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact icon={Users} title="No customers yet" text="Registered customers will appear here." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function StockList({ title, items, tone, empty }) {
  return (
    <section className="admin-card">
      <div className="admin-card__head">
        <h2>{title}</h2>
        <Link to={`/admin/inventory?status=${tone}`} className="link">
          Manage
        </Link>
      </div>
      <div className="admin-card__body">
        {items.length ? (
          <ul className="dash-list">
            {items.map((p) => (
              <li key={p._id}>
                <Link to={`/admin/products/${p._id}/edit`} className="dash-list__row">
                  <SmartImage src={p.images?.[0]?.url} alt="" width={80} ratio="1 / 1" className="dash-list__thumb" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.isSoldOut ? 'Marked sold out' : `${p.availableStock} available`}</small>
                  </span>
                  <StatusBadge status={p.isSoldOut ? 'sold_out' : tone} size="sm" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={CheckCircle2} title="All good" text={empty} />
        )}
      </div>
    </section>
  );
}
