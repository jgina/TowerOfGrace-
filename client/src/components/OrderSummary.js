import SmartImage from './SmartImage';
import { formatCurrency } from '../utils/format';
import './OrderSummary.css';

/** Sticky summary card used by cart and checkout. */
export default function OrderSummary({ items, subtotal, deliveryFee, deliveryLabel, children, title = 'Order Summary', showItems = true }) {
  const total = subtotal + (deliveryFee || 0);
  return (
    <aside className="order-summary">
      <h2 className="order-summary__title">{title}</h2>
      {showItems && (
        <ul className="order-summary__items">
          {items.map((item) => (
            <li key={item.key}>
              <div className="order-summary__thumb">
                <SmartImage src={item.image} alt="" width={120} ratio="1 / 1" />
                <span>{item.quantity}</span>
              </div>
              <div className="order-summary__name">
                <strong>{item.name}</strong>
                {item.variantLabel && <small>{item.variantLabel}</small>}
              </div>
              <span className="cell-number">{formatCurrency(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="order-summary__totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatCurrency(subtotal)}</dd>
        </div>
        <div>
          <dt>Delivery{deliveryLabel ? ` (${deliveryLabel})` : ''}</dt>
          <dd>{deliveryFee === undefined ? 'Calculated at checkout' : deliveryFee === 0 ? 'Free' : formatCurrency(deliveryFee)}</dd>
        </div>
        <div className="order-summary__grand">
          <dt>Total</dt>
          <dd>{formatCurrency(total)}</dd>
        </div>
      </dl>
      {children}
    </aside>
  );
}
