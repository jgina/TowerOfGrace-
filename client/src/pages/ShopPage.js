import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Truck, ShieldCheck, Scale, PhoneCall, ArrowRight, PackageSearch } from 'lucide-react';
import SEO from '../components/SEO';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { ErrorState } from '../components/Loader';
import useFetch from '../hooks/useFetch';
import useDebounce from '../hooks/useDebounce';
import { catalogService } from '../services/catalogService';
import { formatCurrency } from '../utils/format';
import './ShopPage.css';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name_asc', label: 'Name: A–Z' },
];

const TRUST_ITEMS = [
  { icon: Scale, title: 'Choose Your Weight', text: 'Select the size or pack that fits your needs' },
  { icon: ShieldCheck, title: 'Hygienic Handling', text: 'Clean processes from farm to packaging' },
  { icon: Truck, title: 'Delivery or Pickup', text: 'Choose how you receive your order' },
  { icon: PhoneCall, title: 'Real Support', text: 'Talk to our team about any order' },
];

export default function ShopPage() {
  const { categorySlug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(params.get('q') || '');
  const debouncedSearch = useDebounce(search);

  const filters = {
    q: params.get('q') || '',
    category: categorySlug || params.get('category') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    minWeight: params.get('minWeight') || '',
    maxWeight: params.get('maxWeight') || '',
    inStock: params.get('inStock') === 'true',
    sort: params.get('sort') || 'featured',
    page: parseInt(params.get('page'), 10) || 1,
  };

  const update = (changes, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === false || value === null || value === undefined) next.delete(key);
      else next.set(key, String(value));
    });
    if (resetPage && !('page' in changes)) next.delete('page');
    setParams(next, { replace: false });
  };

  useEffect(() => {
    if (debouncedSearch !== filters.q) update({ q: debouncedSearch.trim() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [filtersOpen]);

  const options = useFetch(() => catalogService.getFilters(), []);
  const query = useMemo(
    () => ({ ...filters, inStock: filters.inStock ? 'true' : '', limit: 12 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.toString(), categorySlug]
  );
  const results = useFetch(() => catalogService.listProducts(query), [query]);

  const categories = options.data?.categories || [];
  const activeCategory = categories.find((c) => c.slug === filters.category);
  const ranges = options.data?.ranges || {};
  const products = results.data?.products || [];
  const meta = results.data?.meta;

  const selectCategory = (slug) => {
    const rest = new URLSearchParams(params);
    rest.delete('category');
    rest.delete('page');
    const qs = rest.toString();
    navigate(`${slug ? `/products/${slug}` : '/shop'}${qs ? `?${qs}` : ''}`);
  };

  const activeChips = [
    filters.q && { key: 'q', label: `“${filters.q}”`, clear: () => { setSearch(''); update({ q: '' }); } },
    activeCategory && { key: 'category', label: activeCategory.name, clear: () => selectCategory('') },
    (filters.minPrice || filters.maxPrice) && {
      key: 'price',
      label: `${filters.minPrice ? formatCurrency(filters.minPrice) : 'Any'} – ${filters.maxPrice ? formatCurrency(filters.maxPrice) : 'Any'}`,
      clear: () => update({ minPrice: '', maxPrice: '' }),
    },
    (filters.minWeight || filters.maxWeight) && {
      key: 'weight',
      label: `${filters.minWeight || '0'}–${filters.maxWeight || '∞'} kg`,
      clear: () => update({ minWeight: '', maxWeight: '' }),
    },
    filters.inStock && { key: 'stock', label: 'In stock', clear: () => update({ inStock: '' }) },
  ].filter(Boolean);

  const title = activeCategory ? activeCategory.name : 'Commercial Poultry Shop';

  return (
    <>
      <SEO
        title={activeCategory ? `${activeCategory.name} for Sale` : 'Shop Poultry Products'}
        description={`Buy ${activeCategory ? activeCategory.name.toLowerCase() : 'broilers, noilers, eggs and turkeys'} online from Tower of Grace Farms. Choose your weight or pack size and order for delivery or pickup.`}
      />

      <section className="shop-head">
        <div className="container">
          <Breadcrumbs items={activeCategory ? [{ label: 'Shop', to: '/shop' }, { label: activeCategory.name }] : [{ label: 'Shop' }]} />
          <div className="shop-head__row">
            <div>
              <h1 className="display-title shop-head__title">{title}</h1>
              <p className="text-muted">
                {activeCategory?.description || 'Browse our poultry and choose the weight or pack size you need.'}
              </p>
            </div>
            <form className="shop-search" onSubmit={(e) => e.preventDefault()} role="search">
              <div className="input-group">
                <Search aria-hidden="true" />
                <input
                  className="input"
                  type="search"
                  placeholder="Search products or SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search products"
                />
              </div>
            </form>
          </div>
          <div className="shop-tabs" role="tablist" aria-label="Categories">
            <button type="button" role="tab" aria-selected={!filters.category} className={!filters.category ? 'is-active' : ''} onClick={() => selectCategory('')}>
              All Products
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                type="button"
                role="tab"
                aria-selected={filters.category === c.slug}
                className={filters.category === c.slug ? 'is-active' : ''}
                onClick={() => selectCategory(c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section shop-body">
        <div className="container shop-layout">
          <aside className={`shop-filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Filters">
            <div className="shop-filters__head">
              <h2>Filters</h2>
              <button type="button" className="icon-btn show-mobile-filter" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X />
              </button>
            </div>

            <div className="filter-block">
              <h3>Category</h3>
              <label className="checkbox">
                <input type="radio" name="category" checked={!filters.category} onChange={() => selectCategory('')} /> All products
              </label>
              {categories.map((c) => (
                <label key={c._id} className="checkbox">
                  <input type="radio" name="category" checked={filters.category === c.slug} onChange={() => selectCategory(c.slug)} /> {c.name}
                </label>
              ))}
            </div>

            <RangeFilter
              title="Price (₦)"
              min={filters.minPrice}
              max={filters.maxPrice}
              placeholderMin={ranges.minPrice ? Math.floor(ranges.minPrice) : 'Min'}
              placeholderMax={ranges.maxPrice ? Math.ceil(ranges.maxPrice) : 'Max'}
              onApply={(min, max) => update({ minPrice: min, maxPrice: max })}
            />

            <RangeFilter
              title="Weight (kg)"
              min={filters.minWeight}
              max={filters.maxWeight}
              step="0.1"
              placeholderMin={ranges.minWeight ?? 'Min'}
              placeholderMax={ranges.maxWeight ?? 'Max'}
              onApply={(min, max) => update({ minWeight: min, maxWeight: max })}
            />

            <div className="filter-block">
              <h3>Availability</h3>
              <label className="switch">
                <input type="checkbox" checked={filters.inStock} onChange={(e) => update({ inStock: e.target.checked })} />
                <span className="switch__track" />
                In stock only
              </label>
            </div>

            <div className="shop-filters__foot show-mobile-filter">
              <button type="button" className="btn btn--primary btn--block" onClick={() => setFiltersOpen(false)}>
                Show {meta?.total ?? ''} results
              </button>
            </div>
          </aside>
          {filtersOpen && <div className="shop-filters__backdrop" onClick={() => setFiltersOpen(false)} />}

          <div className="shop-results">
            <div className="shop-toolbar">
              <button type="button" className="btn btn--outline btn--sm show-mobile-filter" onClick={() => setFiltersOpen(true)}>
                <SlidersHorizontal /> Filters {activeChips.length > 0 && `(${activeChips.length})`}
              </button>
              <span className="shop-toolbar__count">
                {results.loading ? 'Loading products…' : `${meta?.total ?? 0} product${meta?.total === 1 ? '' : 's'}`}
              </span>
              <label className="shop-toolbar__sort">
                <span className="hide-mobile">Sort by</span>
                <select className="select" value={filters.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {activeChips.length > 0 && (
              <div className="shop-chips">
                {activeChips.map((chip) => (
                  <button key={chip.key} type="button" className="shop-chip" onClick={chip.clear}>
                    {chip.label} <X aria-hidden="true" />
                  </button>
                ))}
                <button
                  type="button"
                  className="link"
                  onClick={() => {
                    setSearch('');
                    navigate(categorySlug ? `/products/${categorySlug}` : '/shop');
                  }}
                >
                  Clear all
                </button>
              </div>
            )}

            {results.error ? (
              <ErrorState message={results.error} onRetry={results.reload} />
            ) : results.loading ? (
              <div className="product-grid shop-grid">
                {Array.from({ length: 6 }, (_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length ? (
              <>
                <div className="product-grid shop-grid">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
                <Pagination
                  page={meta.page}
                  pages={meta.pages}
                  onChange={(page) => {
                    update({ page }, false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </>
            ) : (
              <EmptyState
                icon={PackageSearch}
                title={activeChips.length ? 'No products match your filters' : 'Products are coming soon'}
                text={
                  activeChips.length
                    ? 'Try removing a filter or searching for something else.'
                    : 'Our team is updating the catalogue. For urgent or large orders, send a bulk order request.'
                }
                action={
                  activeChips.length ? (
                    <Link to="/shop" className="btn btn--outline">
                      View all products
                    </Link>
                  ) : (
                    <Link to="/bulk-orders" className="btn btn--accent">
                      Request supply
                    </Link>
                  )
                }
              />
            )}
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-strip__grid">
          {TRUST_ITEMS.map(({ icon: Icon, title: t, text }) => (
            <div key={t} className="trust-strip__item">
              <Icon aria-hidden="true" />
              <div>
                <strong>{t}</strong>
                <span>{text}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="shop-cta">
        <div className="container shop-cta__inner">
          <div>
            <span className="eyebrow">Bulk & wholesale</span>
            <h2 className="display-title">Ordering for a hotel, restaurant or store?</h2>
            <p>Send us your quantities and preferred weights and our sales team will respond with availability and pricing.</p>
          </div>
          <Link to="/bulk-orders" className="btn btn--accent btn--lg">
            Request a Bulk Quote <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}

function RangeFilter({ title, min, max, onApply, step = '1', placeholderMin, placeholderMax }) {
  const [low, setLow] = useState(min);
  const [high, setHigh] = useState(max);
  useEffect(() => {
    setLow(min);
    setHigh(max);
  }, [min, max]);

  const invalid = low !== '' && high !== '' && Number(low) > Number(high);
  return (
    <form
      className="filter-block"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid) onApply(low, high);
      }}
    >
      <h3>{title}</h3>
      <div className="range-inputs">
        <input className="input" type="number" min="0" step={step} placeholder={String(placeholderMin)} value={low} onChange={(e) => setLow(e.target.value)} aria-label={`${title} minimum`} />
        <span>–</span>
        <input className="input" type="number" min="0" step={step} placeholder={String(placeholderMax)} value={high} onChange={(e) => setHigh(e.target.value)} aria-label={`${title} maximum`} />
      </div>
      {invalid && <span className="field__error">Minimum must be less than maximum</span>}
      <button type="submit" className="btn btn--outline btn--sm" disabled={invalid}>
        Apply
      </button>
    </form>
  );
}
