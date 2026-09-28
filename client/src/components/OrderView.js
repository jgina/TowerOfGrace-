import { Check, X } from 'lucide-react';
import SmartImage from './SmartImage';
import StatusBadge from './StatusBadge';
import { formatCurrency, formatDate, formatDateTime, humanize } from '../utils/format';
import { PAYMENT_METHODS } from '../utils/constants';
import './OrderView.css';

const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];

export function OrderTimeline({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="order-timeline order-timeline--cancelled">
        <X aria-hidden="true" /> This order was cancelled
      </div>
    );
  }
  const current = FLOW.indexOf(status);
  return (
    <ol className="order-timeline">
      {FLOW.map((step, index) => (
        <li key={step} className={index < current ? 'is-done' : index === current ? 'is-current' : ''}>
          <span className="order-timeline__dot">{index < current ? <Check /> : index + 1}</span>
          <span className="order-timeline__label">{humanize(step)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Read-only order presentation shared by confirmation, tracking and account pages. */
export default function OrderView({ order }) {
  return (
    <div className="order-view">
      <div className="order-view__head card">
        <div>
          <span className="field__label">Order number</span>
          <strong className="order-view__number">{order.orderNumber}</strong>
          <span className="text-muted">Placed {formatDateTime(order.createdAt)}</span>
        </div>
        <div className="order-view__badges">
          <StatusBadge status={order.orderStatus} />
          <StatusBadge status={order.paymentStatus}>{`Payment: ${humanize(order.paymentStatus)}`}</StatusBadge>
        </div>
      </div>

      <div className="card order-view__section">
        <OrderTimeline status={order.orderStatus} />
      </div>

      <div className="order-view__grid">
        <div className="card order-view__section">
          <h3>Items</h3>
          <ul className="order-view__items">
            {order.items.map((item, i) => (
              <li key={`${item.product}-${item.variantId || i}`}>
                <SmartImage src={item.image} alt="" width={120} ratio="1 / 1" />
                <div>
                  <strong>{item.name}</strong>
                  {item.variantLabel && <small>{item.variantLabel}</small>}
                  <small>
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </small>
                </div>
                <span className="cell-number">{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="order-view__totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatCurrency(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>{order.deliveryFee ? formatCurrency(order.deliveryFee) : 'Free'}</dd>
            </div>
            <div className="order-view__grand">
              <dt>Total</dt>
              <dd>{formatCurrency(order.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="order-view__side">
          <div className="card order-view__section">
            <h3>Customer</h3>
            <p>{order.customer.fullName}</p>
            <p className="text-muted">{order.customer.email}</p>
            <p className="text-muted">{order.customer.phone}</p>
          </div>
          <div className="card order-view__section">
            <h3>Delivery</h3>
            <p>{order.deliveryMethodLabel || humanize(order.deliveryMethod)}</p>
            {order.deliveryAddress?.address && (
              <p className="text-muted">
                {order.deliveryAddress.address}, {order.deliveryAddress.city}, {order.deliveryAddress.state}
              </p>
            )}
            {order.preferredDeliveryDate && <p className="text-muted">Preferred date: {formatDate(order.preferredDeliveryDate)}</p>}
          </div>
          <div className="card order-view__section">
            <h3>Payment</h3>
            <p>{PAYMENT_METHODS[order.paymentMethod]?.label || humanize(order.paymentMethod)}</p>
            {order.paidAt && <p className="text-muted">Paid {formatDateTime(order.paidAt)}</p>}
          </div>
          {order.notes && (
            <div className="card order-view__section">
              <h3>Your notes</h3>
              <p className="prose">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
