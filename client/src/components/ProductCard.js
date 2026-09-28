import { Link } from 'react-router-dom';
import { ShoppingCart, ArrowRight, Scale } from 'lucide-react';
import SmartImage from './SmartImage';
import StatusBadge from './StatusBadge';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/format';
import { productImage } from '../assets/images';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const toast = useToast();
  const image = productImage(product);
  const hasOptions = product.variants?.length > 0;
  const onSale = !hasOptions && product.salePrice > 0 && product.salePrice < product.price;
  const showBadge = product.stockStatus && product.stockStatus !== 'in_stock';
  const url = `/product/${product.slug}`;
  const optionSummary = hasOptions
    ? `${product.variants.length} ${product.category?.variantType === 'packaging' ? 'pack sizes' : 'weight options'}`
    : product.weightLabel;

  const quickAdd = () => {
    addItem(
      {
        productId: product._id,
        slug: product.slug,
        name: product.name,
        image: image?.url,
        category: product.category?.name,
        unitPrice: product.effectivePrice,
        maxQuantity: product.availableStock,
      },
      1
    );
    toast.success(`${product.name} added to cart`);
  };

  return (
    <article className="product-card">
      <Link to={url} className="product-card__media" aria-label={product.name}>
        <SmartImage src={image?.url} alt={image?.alt || product.name} width={600} ratio="4 / 3" label={product.category?.name} />
        {product.category?.name && <span className="product-card__tag">{product.category.name}</span>}
        {showBadge && (
          <span className="product-card__status">
            <StatusBadge status={product.stockStatus} size="sm" />
          </span>
        )}
      </Link>

      <div className="product-card__body">
        <h3 className="product-card__title">
          <Link to={url}>{product.name}</Link>
        </h3>
        {product.shortDescription && <p className="product-card__desc">{product.shortDescription}</p>}
        {optionSummary && (
          <p className="product-card__meta">
            <Scale aria-hidden="true" /> {optionSummary}
          </p>
        )}

        <div className="product-card__footer">
          <div className="product-card__price">
            {hasOptions && product.priceTo > product.priceFrom && <small>From</small>}
            <strong>{formatCurrency(hasOptions ? product.priceFrom : product.effectivePrice)}</strong>
            {onSale && <del>{formatCurrency(product.price)}</del>}
          </div>
          {hasOptions || !product.purchasable ? (
            <Link to={url} className="btn btn--primary btn--sm">
              {product.purchasable ? 'Select' : 'View'} <ArrowRight />
            </Link>
          ) : (
            <button type="button" className="btn btn--accent btn--sm" onClick={quickAdd}>
              <ShoppingCart /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card product-card--skeleton" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: '4 / 3' }} />
      <div className="product-card__body">
        <div className="skeleton" style={{ height: 18, width: '70%' }} />
        <div className="skeleton" style={{ height: 12, width: '90%' }} />
        <div className="skeleton" style={{ height: 12, width: '50%' }} />
        <div className="skeleton" style={{ height: 34, width: '100%', marginTop: 12 }} />
      </div>
    </div>
  );
}
