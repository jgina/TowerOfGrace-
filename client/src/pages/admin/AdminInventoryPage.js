import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Boxes, Lock, AlertTriangle, PackageX, SlidersHorizontal, Warehouse, Skull } from 'lucide-react';
import RecordLossModal from '../../components/RecordLossModal';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import DataTable from '../../components/DataTable';
import SmartImage from '../../components/SmartImage';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import useDebounce from '../../hooks/useDebounce';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import './AdminInventoryPage.css';

export default function AdminInventoryPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const status = params.get('status') || '';
  const category = params.get('category') || '';
  const categories = useFetch(() => adminService.listCategories(), []);
  const { data, loading, error, reload } = useFetch(() => adminService.inventory({ q, status, category }), [q, status, category]);
  const [editing, setEditing] = useState(null);
  const [mode, setMode] = useState('set');
  const [value, setValue] = useState('');
  const [threshold, setThreshold] = useState('');
  const [busy, setBusy] = useState(false);
  const [lossPreset, setLossPreset] = useState(null);

  const setParam = (key, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(key, v);
    else next.delete(key);
    setParams(next);
  };

  const open = (row) => {
    setEditing(row);
    setMode('set');
    setValue(String(row.stock));
    setThreshold(String(row.lowStockThreshold));
  };

  const preview = useMemo(() => {
    if (!editing) return null;
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return null;
    return mode === 'set' ? n : editing.stock + n;
  }, [editing, mode, value]);

  const invalid = preview === null || preview < 0 || (editing && preview < editing.reservedStock);

  const save = async (e) => {
    e.preventDefault();
    if (invalid) return;
    setBusy(true);
    try {
      await adminService.updateInventory(editing.productId, {
        variantId: editing.variantId,
        ...(mode === 'set' ? { stock: parseInt(value, 10) } : { adjustment: parseInt(value, 10) }),
        lowStockThreshold: threshold,
      });
      toast.success('Stock updated');
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const summary = data?.summary;

  return (
    <>
      <AdminPageHeader
        eyebrow="Inventory"
        title="Stock & Weight Ledger"
        subtitle="On-hand stock for every product and weight or pack option. Reserved stock is held by orders that are not yet completed."
        actions={
          <Link to="/admin/losses" className="btn btn--outline">
            <Skull /> Mortality & Losses
          </Link>
        }
      />

      <div className="stats-grid inventory-stats">
        <AdminStatsCard tone="dark" icon={Boxes} label="Units on hand" value={summary?.totalStock ?? '—'} hint={`${summary?.rows ?? 0} stock lines`} />
        <AdminStatsCard tone="blue" icon={Lock} label="Reserved" value={summary?.totalReserved ?? '—'} hint="Held by open orders" />
        <AdminStatsCard tone="amber" icon={AlertTriangle} label="Low stock lines" value={summary?.lowStock ?? '—'} />
        <AdminStatsCard tone="red" icon={PackageX} label="Out of stock lines" value={summary?.outOfStock ?? '—'} />
      </div>

      <div className="admin-toolbar">
        <div className="input-group">
          <Search aria-hidden="true" />
          <input className="input" type="search" placeholder="Search product, option or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" value={category} onChange={(e) => setParam('category', e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {(categories.data || []).map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Filter by stock status">
          <option value="">All stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
          <option value="reserved">Has reservations</option>
        </select>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <DataTable
          loading={loading}
          rows={data?.rows}
          rowKey={(r) => `${r.productId}-${r.variantId || 'base'}`}
          empty={{
            icon: Warehouse,
            title: q || status || category ? 'No stock lines match' : 'No inventory yet',
            text: q || status || category ? 'Try a different filter.' : 'Inventory appears once you create products.',
            action: (
              <Link to="/admin/products/new" className="btn btn--accent">
                Create product
              </Link>
            ),
          }}
          columns={[
            {
              key: 'product',
              header: 'Product',
              render: (r) => (
                <div className="cell-main">
                  <SmartImage src={r.image} alt="" width={100} ratio="1 / 1" />
                  <div>
                    <Link to={`/admin/products/${r.productId}/edit`} className="cell-title">
                      {r.productName}
                    </Link>
                    <span className="cell-sub">{r.category}</span>
                  </div>
                </div>
              ),
            },
            { key: 'variantLabel', header: 'Option', render: (r) => <span className="inventory-option">{r.variantLabel}</span> },
            { key: 'sku', header: 'SKU', hideOnMobile: true, render: (r) => r.sku || '—' },
            { key: 'stock', header: 'On hand', align: 'right', render: (r) => <span className="cell-number">{r.stock}</span> },
            { key: 'reservedStock', header: 'Reserved', align: 'right', render: (r) => <span className="cell-number inventory-reserved">{r.reservedStock}</span> },
            { key: 'availableStock', header: 'Available', align: 'right', render: (r) => <strong className="cell-number">{r.availableStock}</strong> },
            {
              key: 'status',
              header: 'Status',
              render: (r) => (r.isActive ? <StatusBadge status={r.status} size="sm" /> : <StatusBadge tone="neutral" size="sm">Disabled</StatusBadge>),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (r) => (
                <div className="cell-actions">
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => open(r)}>
                    <SlidersHorizontal /> Update
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setLossPreset({ productId: r.productId, variantId: r.variantId || '' })}
                    disabled={r.availableStock <= 0}
                    title="Record dead birds, broken eggs or other losses"
                  >
                    <Skull /> Record loss
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <RecordLossModal open={Boolean(lossPreset)} preset={lossPreset} onClose={() => setLossPreset(null)} onSaved={reload} />

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Update stock"
        subtitle={editing ? `${editing.productName}${editing.variantId ? ` · ${editing.variantLabel}` : ''}` : ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="submit" form="stock-form" className="btn btn--primary" disabled={busy || invalid}>
              {busy && <span className="spinner" />} Save stock
            </button>
          </>
        }
      >
        {editing && (
          <form id="stock-form" className="stack" onSubmit={save}>
            <div className="inventory-modal__facts">
              <div>
                <span>On hand</span>
                <strong>{editing.stock}</strong>
              </div>
              <div>
                <span>Reserved</span>
                <strong>{editing.reservedStock}</strong>
              </div>
              <div>
                <span>Available</span>
                <strong>{editing.availableStock}</strong>
              </div>
            </div>
            <div className="inventory-modal__mode" role="radiogroup" aria-label="Update mode">
              <button type="button" className={mode === 'set' ? 'is-active' : ''} onClick={() => { setMode('set'); setValue(String(editing.stock)); }}>
                Set exact count
              </button>
              <button type="button" className={mode === 'adjust' ? 'is-active' : ''} onClick={() => { setMode('adjust'); setValue(''); }}>
                Add / remove
              </button>
            </div>
            <FormField
              label={mode === 'set' ? 'New on-hand stock' : 'Adjustment (use a minus sign to remove)'}
              error={
                preview !== null && preview < 0
                  ? 'Stock cannot be negative'
                  : preview !== null && preview < editing.reservedStock
                  ? `Stock cannot go below the ${editing.reservedStock} reserved units`
                  : undefined
              }
              hint={preview !== null ? `On hand after update: ${preview}` : undefined}
            >
              <input className="input" type="number" step="1" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
            </FormField>
            <FormField label="Low-stock alert at" hint="Applies to the whole product">
              <input className="input" type="number" min="0" step="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </FormField>
          </form>
        )}
      </Modal>
    </>
  );
}
