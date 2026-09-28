import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, Zap, Building2, Check, PackageCheck, Snowflake, Factory, ChefHat, Package, AlertCircle } from 'lucide-react';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import SmartImage from '../components/SmartImage';
import StatusBadge from '../components/StatusBadge';
import QuantitySelector from '../components/QuantitySelector';
import ProductCard from '../components/ProductCard';
import BarChart from '../components/BarChart';
import { PageLoader, ErrorState } from '../components/Loader';
import EmptyState from '../components/EmptyState';
import useFetch from '../hooks/useFetch';
import { catalogService } from '../services/catalogService';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/format';
import { CATEGORY_IMAGES } from '../assets/images';
import './ProductDetailsPage.css';

export default function ProductDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem, items: cartItems } = useCart();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => catalogService.getProduct(slug), [slug]);
  const product = data?.product;
  const related = data?.related || [];

  const [imageIndex, setImageIndex] = useState(0);
  const [variantId, setVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('description');

  useEffect(() => {
    setImageIndex(0);
    setQuantity(1);
    const firstAvailable = product?.variants?.find((v) => v.inStock) || product?.variants?.[0];
    setVariantId(firstAvailable?._id || null);
  }, [product]);

  const variant = product?.variants?.find((v) => v._id === variantId) || null;
  const hasVariants = product?.variants?.length > 0;
  const isPackaging = product?.category?.variantType === 'packaging' || product?.variants?.[0]?.type === 'packaging';
  const unitPrice = variant ? variant.effectivePrice : product?.effectivePrice;
  const listPrice = variant ? variant.price : product?.price;
  const available = variant ? variant.availableStock : product?.availableStock ?? 0;
  const inCart = cartItems.find((i) => i.productId === product?._id && (i.variantId || null) === (variant?._id || null))?.quantity || 0;
  const maxQty = Math.max(available - inCart, 0);
  const canBuy = product?.purchasable && (!hasVariants || (variant && variant.inStock)) && maxQty > 0;

  const tabs = useMemo(
    () =>
      product
        ? [
            { id: 'description', label: 'Description', icon: Package, text: product.description || product.shortDescription },
            { id: 'packaging', label: 'Packaging', icon: PackageCheck, text: product.packaging },
            { id: 'storage', label: 'Storage', icon: Snowflake, text: product.storageInfo },
            { id: 'production', label: 'Production', icon: Factory, text: product.productionInfo },
            { id: 'use', label: 'Recommended Use', icon: ChefHat, text: product.recommendedUse },
          ].filter((t) => t.text)
        : [],
    [product]
  );

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === tab)) setTab(tabs[0].id);
  }, [tabs, tab]);

  if (loading) return <PageLoader label="Loading product…" />;
  if (error) {
    return (
      <div className="container section">
        {error.toLowerCase().includes('not found') ? (
          <EmptyState
            title="Product not found"
            text="This product may have been removed or renamed."
            action={
              <Link to="/shop" className="btn btn--primary">
                Back to shop
              </Link>
            }
          />
        ) : (
          <ErrorState message={error} onRetry={reload} />
        )}
      </div>
    );
  }
  if (!product) return null;

  const fallbackImage = CATEGORY_IMAGES[product.category?.slug];
  const images = product.images?.length ? product.images : fallbackImage ? [fallbackImage] : [];
  const activeImage = images[imageIndex];

  const cartLine = () => ({
    productId: product._id,
    variantId: variant?._id,
    slug: product.slug,
    name: product.name,
    image: images[0]?.url,
    category: product.category?.name,
    variantLabel: variant ? [variant.label, variant.weightLabel].filter((v, i, a) => v && a.indexOf(v) === i).join(' · ') : product.weightLabel,
    unitPrice,
    maxQuantity: available,
  });

  const addToCart = () => {
    if (!canBuy) return;
    addItem(cartLine(), quantity);
    toast.success(`${quantity} × ${product.name}${variant ? ` (${variant.label})` : ''} added to cart`, {
      action: (
        <Link to="/cart" className="link">
          View cart
        </Link>
      ),
    });
    setQuantity(1);
  };

  const buyNow = () => {
    if (!canBuy) return;
    addItem(cartLine(), quantity);
    navigate('/checkout');
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.sku,
    image: (product.images || []).map((i) => i.url),
    category: product.category?.name,
    brand: { '@type': 'Brand', name: 'Tower of Grace Farms' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'NGN',
      lowPrice: product.priceFrom,
      highPrice: product.priceTo || product.priceFrom,
      offerCount: product.variants.length || 1,
      availability: product.purchasable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  const chartData = product.variants.map((v) => ({ label: v.label, value: v.effectivePrice }));

  return (
    <>
      <SEO
        title={product.seo?.metaTitle || product.name}
        description={product.seo?.metaDescription || product.shortDescription}
        image={product.images?.[0]?.url}
        type="product"
        jsonLd={jsonLd}
      />

      <section className="pdp-top">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: 'Shop', to: '/shop' },
              ...(product.category ? [{ label: product.category.name, to: `/products/${product.category.slug}` }] : []),
              { label: product.name },
            ]}
          />

          <div className="pdp">
            <div className="pdp-gallery">
              <div className="pdp-gallery__main">
                <SmartImage src={activeImage?.url} alt={activeImage?.alt || product.name} width={1100} ratio="1 / 1" label={product.category?.name} eager />
                {product.isFeatured && <span className="pdp-gallery__flag">Featured</span>}
              </div>
              {images.length > 1 && (
                <div className="pdp-gallery__thumbs" role="tablist" aria-label="Product images">
                  {images.map((img, i) => (
                    <button
                      key={img.publicId || img.url}
                      type="button"
                      role="tab"
                      aria-selected={i === imageIndex}
                      className={i === imageIndex ? 'is-active' : ''}
                      onClick={() => setImageIndex(i)}
                      aria-label={`View image ${i + 1}`}
                    >
                      <SmartImage src={img.url} alt="" width={200} ratio="1 / 1" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pdp-info">
              <div className="row row--wrap">
                {product.category && <span className="pdp-info__category">{product.category.name}</span>}
                <StatusBadge status={variant && !variant.inStock && product.purchasable ? 'out_of_stock' : product.stockStatus} />
              </div>
              <h1 className="pdp-info__title display-title">{product.name}</h1>
              {product.sku && <span className="pdp-info__sku">SKU: {variant?.sku || product.sku}</span>}

              <div className="pdp-price">
                <strong>{formatCurrency(unitPrice)}</strong>
                {listPrice > unitPrice && <del>{formatCurrency(listPrice)}</del>}
                <span>{isPackaging ? 'per pack' : 'per bird'}</span>
              </div>

              {product.shortDescription && <p className="pdp-info__lead">{product.shortDescription}</p>}

              {hasVariants && (
                <div className="pdp-options">
                  <span className="field__label">{isPackaging ? 'Select pack size' : 'Select weight / size'}</span>
                  <div className="chip-group">
                    {product.variants.map((v) => (
                      <button
                        key={v._id}
                        type="button"
                        className="chip"
                        aria-pressed={v._id === variantId}
                        disabled={!v.inStock}
                        onClick={() => {
                          setVariantId(v._id);
                          setQuantity(1);
                        }}
                      >
                        {v.label}
                        <small>
                          {v.weightLabel && v.weightLabel !== v.label ? `${v.weightLabel} · ` : ''}
                          {v.inStock ? formatCurrency(v.effectivePrice) : 'Out of stock'}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!hasVariants && product.weightLabel && (
                <div className="pdp-spec-inline">
                  <span className="field__label">Weight</span>
                  <strong>{product.weightLabel}</strong>
                </div>
              )}

              <div className={`pdp-stock ${canBuy ? '' : 'pdp-stock--warning'}`}>
                {canBuy ? (
                  <>
                    <Check aria-hidden="true" />
                    {available <= 20 ? `Only ${available} available` : 'Available to order'}
                    {inCart > 0 && <span className="text-muted"> · {inCart} already in your cart</span>}
                  </>
                ) : (
                  <>
                    <AlertCircle aria-hidden="true" />
                    {inCart > 0 && available > 0
                      ? 'You have all available stock of this option in your cart'
                      : 'Currently unavailable — request supply via bulk order'}
                  </>
                )}
              </div>

              <div className="pdp-buy">
                <QuantitySelector value={Math.min(quantity, Math.max(maxQty, 1))} onChange={setQuantity} max={Math.max(maxQty, 1)} />
                <button type="button" className="btn btn--accent btn--lg" onClick={addToCart} disabled={!canBuy}>
                  <ShoppingCart /> Add to Cart
                </button>
                <button type="button" className="btn btn--primary btn--lg" onClick={buyNow} disabled={!canBuy}>
                  <Zap /> Buy Now
                </button>
              </div>

              <Link to={`/bulk-orders?product=${encodeURIComponent(product.name)}`} className="pdp-bulk">
                <Building2 aria-hidden="true" />
                <span>
                  <strong>Need a large quantity?</strong> Request a bulk order for hotels, restaurants and retailers.
                </span>
              </Link>

              <dl className="pdp-facts">
                <div>
                  <dt>Category</dt>
                  <dd>{product.category?.name || '—'}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>{product.availability === 'pre_order' ? 'Pre-order' : product.purchasable ? 'In stock' : 'Unavailable'}</dd>
                </div>
                {hasVariants && (
                  <div>
                    <dt>{isPackaging ? 'Pack sizes' : 'Weight options'}</dt>
                    <dd>{product.variants.length}</dd>
                  </div>
                )}
                {product.weightLabel && (
                  <div>
                    <dt>Weight range</dt>
                    <dd>{product.weightLabel}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {(tabs.length > 0 || hasVariants) && (
        <section className="section pdp-details">
          <div className="container pdp-details__grid">
            {tabs.length > 0 && (
              <div className="pdp-tabs card">
                <div className="pdp-tabs__list" role="tablist">
                  {tabs.map((t) => (
                    <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
                      <t.icon aria-hidden="true" /> {t.label}
                    </button>
                  ))}
                </div>
                <div className="pdp-tabs__panel prose" role="tabpanel">
                  {tabs.find((t) => t.id === tab)?.text}
                </div>
              </div>
            )}

            {hasVariants && (
              <div className="pdp-options-table card">
                <h2>{isPackaging ? 'Pack Sizes at a Glance' : 'Weight Options at a Glance'}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>{isPackaging ? 'Pack' : 'Weight'}</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => (
                      <tr key={v._id}>
                        <td>{v.label}</td>
                        <td>{isPackaging ? (v.unitsPerPack ? `${v.unitsPerPack} units` : '—') : v.weightLabel || '—'}</td>
                        <td className="cell-number">{formatCurrency(v.effectivePrice)}</td>
                        <td>
                          <StatusBadge status={v.inStock ? 'in_stock' : 'out_of_stock'} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {chartData.length > 1 && (
                  <div className="pdp-chart">
                    <span className="field__label">Price by option</span>
                    <BarChart data={chartData} formatValue={formatCurrency} height={170} tone="amber" />
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section section--white">
          <div className="container">
            <h2 className="display-title pdp-related__title">You May Also Need</h2>
            <div className="product-grid">
              {related.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
