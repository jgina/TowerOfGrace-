import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CART_KEY = 'tgf_cart_v1';
const CartContext = createContext(null);

function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.productId && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

const lineKey = (productId, variantId) => `${productId}:${variantId || 'base'}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable; cart still works for this session */
    }
  }, [items]);

  // Keep carts in sync across open tabs.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === CART_KEY) setItems(loadCart());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /**
   * item: { productId, variantId, slug, name, image, category, variantLabel, unitPrice, maxQuantity }
   * Quantities are capped at the stock available when the item was added; the server re-validates at checkout.
   */
  const addItem = useCallback((item, quantity = 1) => {
    setItems((current) => {
      const key = lineKey(item.productId, item.variantId);
      const existing = current.find((line) => line.key === key);
      const cap = item.maxQuantity || Infinity;
      if (existing) {
        return current.map((line) =>
          line.key === key ? { ...line, ...item, quantity: Math.min(line.quantity + quantity, cap) } : line
        );
      }
      return [...current, { ...item, key, quantity: Math.min(quantity, cap) }];
    });
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    setItems((current) =>
      current
        .map((line) => (line.key === key ? { ...line, quantity: Math.min(Math.max(quantity, 0), line.maxQuantity || Infinity) } : line))
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((key) => setItems((current) => current.filter((line) => line.key !== key)), []);
  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const count = items.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return { items, count, subtotal, addItem, updateQuantity, removeItem, clearCart };
  }, [items, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
