import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '../../utils/constants';
import { formatCurrency, formatDateTime, humanize } from '../../utils/format';
import './AdminOrdersPage.css';

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounce(search);
  const filters = {
    status: params.get('status') || '',
    paymentStatus: params.get('paymentStatus') || '',
    paymentMethod: params.get('paymentMethod') || '',
    from: params.get('from') || '',
    to: params.get('to') || '',
    awaitingReview: params.get('awaitingReview') || '',
    page: parseInt(params.get('page'), 10) || 1,
  };
  const { data, loading, error, reload } = useFetch(
    () => adminService.listOrders({ ...filters, q, limit: 20 }),
    [q, params.toString()]
  );

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <>
      <AdminPageHeader eyebrow="Sales" title="Orders" subtitle="Search, filter and manage every order placed on the website." />

      <div className="order-status-tabs" role="tablist">
        {['', ...ORDER_STATUSES].map((s) => (
          <button key={s || 'all'} type="button" role="tab" aria-selected={filters.status === s} className={filters.status === s ? 'is-active' : ''} onClick={() => setParam('status', s)}>
            {s ? humanize(s) : 'All'}
          </button>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Order number, customer name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="switch">
          <input type="checkbox" checked={filters.awaitingReview === 'true'} onChange={(e) => setParam('awaitingReview', e.target.checked ? 'true' : '')} />
          <span className="switch__track" /> Receipts to review
        </label>
        <select className="select" value={filters.paymentStatus} onChange={(e) => setParam('paymentStatus', e.target.value)} aria-label="Payment status">
          <option value="">Any payment status</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <select className="select" value={filters.paymentMethod} onChange={(e) => setParam('paymentMethod', e.target.value)} aria-label="Payment method">
          <option value="">Any payment method</option>
          {Object.entries(PAYMENT_METHODS).map(([code, m]) => (
            <option key={code} value={code}>
              {m.label}
            </option>
          ))}
        </select>
        <input className="input orders-date" type="date" value={filters.from} onChange={(e) => setParam('from', e.target.value)} aria-label="From date" />
        <input className="input orders-date" type="date" value={filters.to} onChange={(e) => setParam('to', e.target.value)} aria-label="To date" />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            loading={loading}
            rows={data?.orders}
            onRowClick={(o) => navigate(`/admin/orders/${o._id}`)}
            empty={{ icon: ShoppingBag, title: 'No orders found', text: 'Orders placed on the website will appear here.' }}
            columns={[
              {
                key: 'orderNumber',
                header: 'Order',
                render: (o) => (
                  <div>
                    <span className="cell-title">{o.orderNumber}</span>
                    <span className="cell-sub">{formatDateTime(o.createdAt)}</span>
                  </div>
                ),
              },
              {
                key: 'customer',
                header: 'Customer',
                render: (o) => (
                  <div>
                    <span className="cell-title">{o.customer.fullName}</span>
                    <span className="cell-sub">{o.customer.phone}</span>
                  </div>
                ),
              },
              { key: 'items', header: 'Items', align: 'right', hideOnMobile: true, render: (o) => o.items.reduce((s, i) => s + i.quantity, 0) },
              { key: 'total', header: 'Total', align: 'right', render: (o) => <strong className="cell-number">{formatCurrency(o.total)}</strong> },
              {
                key: 'payment',
                header: 'Payment',
                render: (o) => (
                  <div>
                    {o.awaitingPaymentReview && o.paymentStatus !== 'PAID' ? (
                      <StatusBadge tone="info" size="sm">Receipt to review</StatusBadge>
                    ) : (
                      <StatusBadge status={o.paymentStatus} size="sm" />
                    )}
                    <span className="cell-sub">{PAYMENT_METHODS[o.paymentMethod]?.label}</span>
                  </div>
                ),
              },
              { key: 'orderStatus', header: 'Status', render: (o) => <StatusBadge status={o.orderStatus} size="sm" /> },
              { key: 'delivery', header: 'Delivery', hideOnMobile: true, render: (o) => o.deliveryMethodLabel || humanize(o.deliveryMethod) },
            ]}
          />
          {data?.meta && (
            <div className="orders-foot">
              <span className="text-muted">{data.meta.total} order(s)</span>
              <Pagination page={data.meta.page} pages={data.meta.pages} onChange={(p) => setParam('page', String(p))} />
            </div>
          )}
        </>
      )}
    </>
  );
}
