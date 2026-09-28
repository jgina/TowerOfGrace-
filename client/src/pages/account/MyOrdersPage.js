import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { orderService } from '../../services/orderService';
import { formatCurrency, formatDate } from '../../utils/format';
import './AccountPages.css';

export default function MyOrdersPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => orderService.mine({ page, limit: 10 }), [page]);

  return (
    <div className="card account-panel">
      <div className="account-panel__head">
        <h2>Order History</h2>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <div className="order-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72 }} />
          ))}
        </div>
      ) : data.orders.length ? (
        <>
          <div className="order-list">
            {data.orders.map((order) => (
              <Link key={order._id} to={`/account/orders/${order._id}`} className="order-list__item">
                <div>
                  <span className="order-list__number">{order.orderNumber}</span>
                  <span className="order-list__meta">
                    {formatDate(order.createdAt)} · {order.items.reduce((s, i) => s + i.quantity, 0)} item(s)
                  </span>
                </div>
                <div className="order-list__badges">
                  <StatusBadge status={order.orderStatus} size="sm" />
                  <StatusBadge status={order.paymentStatus} size="sm" />
                </div>
                <span className="order-list__total">{formatCurrency(order.total)}</span>
                <ChevronRight aria-hidden="true" />
              </Link>
            ))}
          </div>
          <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />
        </>
      ) : (
        <EmptyState
          icon={Package}
          compact
          title="No orders yet"
          text="Orders you place while signed in appear here."
          action={
            <Link to="/shop" className="btn btn--accent">
              Start Shopping
            </Link>
          }
        />
      )}
    </div>
  );
}
