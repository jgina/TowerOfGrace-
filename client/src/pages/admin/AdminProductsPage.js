import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, Star, ExternalLink, Package } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import DataTable from '../../components/DataTable';
import SmartImage from '../../components/SmartImage';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import { ConfirmDialog } from '../../components/Modal';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/format';
import './AdminProductsPage.css';

const STATUS_FILTERS = [
  { value: '', label: 'All products' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Disabled' },
  { value: 'featured', label: 'Featured' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'sold_out', label: 'Marked sold out' },
];

export default function AdminProductsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounce(search);
  const category = params.get('category') || '';
  const status = params.get('status') || '';
  const page = parseInt(params.get('page'), 10) || 1;
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const categories = useFetch(() => adminService.listCategories(), []);
  const { data, loading, error, reload, setData } = useFetch(
    () => adminService.listProducts({ q, category, status, page, limit: 20 }),
    [q, category, status, page]
  );

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const patch = async (product, changes, message) => {
    try {
      const updated = await adminService.patchProduct(product._id, changes);
      setData((d) => ({
        ...d,
        products: d.products.map((p) => (p._id === product._id ? { ...p, ...changes, stockStatus: p.stockStatus, availableStock: updated.availableStock } : p)),
      }));
      toast.success(message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      const result = await adminService.deleteProduct(deleting._id);
      toast.success(result.message);
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Product Management"
        subtitle="Create products, set weights or pack sizes, prices, stock and visibility."
        actions={
          <Link to="/admin/products/new" className="btn btn--accent">
            <Plus /> New Product
          </Link>
        }
      />

      <div className="admin-toolbar">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Search name or SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setParam('page', ''); }} />
        </div>
        <select className="select" value={category} onChange={(e) => setParam('category', e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {(categories.data || []).map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Filter by status">
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <DataTable
            loading={loading}
            rows={data?.products}
            empty={{
              icon: Package,
              title: q || category || status ? 'No products match these filters' : 'No products yet',
              text: q || category || status ? 'Try clearing the search or filters.' : 'Create your first product to start selling online.',
              action: (
                <Link to="/admin/products/new" className="btn btn--accent">
                  <Plus /> Create product
                </Link>
              ),
            }}
            columns={[
              {
                key: 'name',
                header: 'Product',
                render: (p) => (
                  <div className="cell-main">
                    <SmartImage src={p.images?.[0]?.url} alt="" width={100} ratio="1 / 1" />
                    <div>
                      <Link to={`/admin/products/${p._id}/edit`} className="cell-title">
                        {p.name}
                      </Link>
                      <span className="cell-sub">
                        {p.sku || 'No SKU'} · {p.variants?.length ? `${p.variants.length} options` : 'Single price'}
                      </span>
                    </div>
                  </div>
                ),
              },
              { key: 'category', header: 'Category', hideOnMobile: true, render: (p) => p.category?.name || '—' },
              {
                key: 'price',
                header: 'Price',
                render: (p) => (
                  <span className="cell-number">
                    {p.priceTo > p.priceFrom ? `${formatCurrency(p.priceFrom)} – ${formatCurrency(p.priceTo)}` : formatCurrency(p.priceFrom)}
                  </span>
                ),
              },
              {
                key: 'stock',
                header: 'Available',
                align: 'right',
                render: (p) => <span className="cell-number">{p.availableStock}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (p) => (
                  <div className="product-status">
                    {p.isActive ? <StatusBadge status={p.isSoldOut ? 'sold_out' : p.stockStatus} size="sm" /> : <StatusBadge tone="neutral" size="sm">Disabled</StatusBadge>}
                  </div>
                ),
              },
              {
                key: 'toggles',
                header: 'Visibility',
                render: (p) => (
                  <div className="product-toggles">
                    <label className="switch" title={p.isActive ? 'Disable product' : 'Enable product'}>
                      <input type="checkbox" checked={p.isActive} onChange={(e) => patch(p, { isActive: e.target.checked }, e.target.checked ? 'Product enabled' : 'Product disabled')} />
                      <span className="switch__track" />
                      <span className="visually-hidden">Active</span>
                    </label>
                    <button
                      type="button"
                      className={`icon-btn product-star ${p.isFeatured ? 'is-on' : ''}`}
                      onClick={() => patch(p, { isFeatured: !p.isFeatured }, p.isFeatured ? 'Removed from featured' : 'Marked as featured')}
                      aria-label={p.isFeatured ? 'Unfeature' : 'Feature'}
                      title={p.isFeatured ? 'Featured' : 'Mark featured'}
                    >
                      <Star />
                    </button>
                    <button
                      type="button"
                      className={`btn btn--sm ${p.isSoldOut ? 'btn--danger' : 'btn--ghost'}`}
                      onClick={() => patch(p, { isSoldOut: !p.isSoldOut }, p.isSoldOut ? 'Sold-out flag removed' : 'Marked as sold out')}
                    >
                      {p.isSoldOut ? 'Sold out' : 'Mark sold out'}
                    </button>
                  </div>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (p) => (
                  <div className="cell-actions">
                    <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="icon-btn" aria-label="View on site">
                      <ExternalLink />
                    </a>
                    <button type="button" className="icon-btn" onClick={() => navigate(`/admin/products/${p._id}/edit`)} aria-label="Edit">
                      <Pencil />
                    </button>
                    <button type="button" className="icon-btn icon-btn--danger" onClick={() => setDeleting(p)} aria-label="Delete">
                      <Trash2 />
                    </button>
                  </div>
                ),
              },
            ]}
          />
          {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} onChange={(p) => setParam('page', String(p))} />}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete product?"
        message={deleting ? `"${deleting.name}" and its images will be permanently deleted. Past orders keep their own record of the product. To hide it temporarily, disable it instead.` : ''}
        confirmLabel="Delete product"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
