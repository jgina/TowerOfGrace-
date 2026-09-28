import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ShoppingCart, Trash2, ShieldCheck } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import SmartImage from '../components/SmartImage';
import QuantitySelector from '../components/QuantitySelector';
import OrderSummary from '../components/OrderSummary';
import EmptyState from '../components/EmptyState';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';
import './CartPage.css';

export default function CartPage() {
  const { items, count, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  return (
    <>
      <SEO title="Shopping Cart" noIndex />
      <PageHero title="Shopping Cart" compact crumbs={[{ label: 'Shop', to: '/shop' }, { label: 'Cart' }]} />

      <section className="section">
        <div className="container">
          {items.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              text="Browse broilers, noilers, eggs and turkeys and add what you need."
              action={
                <Link to="/shop" className="btn btn--accent">
                  Start Shopping
                </Link>
              }
            />
          ) : (
            <div className="cart-layout">
              <div className="cart-panel card">
                <div className="cart-panel__head">
                  <h2>
                    {count} item{count === 1 ? '' : 's'} in your cart
                  </h2>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={clearCart}>
                    <Trash2 /> Clear cart
                  </button>
                </div>

                <div className="cart-table" role="table" aria-label="Cart items">
                  <div className="cart-row cart-row--head" role="row">
                    <span role="columnheader">Product</span>
                    <span role="columnheader">Price</span>
                    <span role="columnheader">Quantity</span>
                    <span role="columnheader">Subtotal</span>
                    <span role="columnheader" className="visually-hidden">
                      Remove
                    </span>
                  </div>
                  {items.map((item) => (
                    <div key={item.key} className="cart-row" role="row">
                      <div className="cart-item" role="cell">
                        <Link to={`/product/${item.slug}`}>
                          <SmartImage src={item.image} alt={item.name} width={200} ratio="1 / 1" />
                        </Link>
                        <div>
                          {item.category && <span className="cart-item__cat">{item.category}</span>}
                          <Link to={`/product/${item.slug}`} className="cart-item__name">
                            {item.name}
                          </Link>
                          {item.variantLabel && <span className="cart-item__variant">{item.variantLabel}</span>}
                        </div>
                      </div>
                      <span role="cell" className="cart-row__price" data-label="Price">
                        {formatCurrency(item.unitPrice)}
                      </span>
                      <span role="cell" data-label="Quantity">
                        <QuantitySelector
                          size="sm"
                          value={item.quantity}
                          max={item.maxQuantity || Infinity}
                          onChange={(q) => updateQuantity(item.key, q)}
                        />
                      </span>
                      <strong role="cell" className="cart-row__subtotal" data-label="Subtotal">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </strong>
                      <span role="cell">
                        <button type="button" className="icon-btn icon-btn--danger" onClick={() => removeItem(item.key)} aria-label={`Remove ${item.name}`}>
                          <Trash2 />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="cart-panel__foot">
                  <Link to="/shop" className="btn btn--outline">
                    <ArrowLeft /> Continue Shopping
                  </Link>
                </div>
              </div>

              <OrderSummary items={items} subtotal={subtotal} showItems={false}>
                <button type="button" className="btn btn--accent btn--lg btn--block" onClick={() => navigate('/checkout')}>
                  Proceed to Checkout <ArrowRight />
                </button>
                <p className="cart-note">
                  <ShieldCheck aria-hidden="true" /> Prices and stock are confirmed when you place your order.
                </p>
              </OrderSummary>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
