import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Plus, Trash2, Info, Copy } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import FormField from '../../components/FormField';
import ImageUploader from '../../components/ImageUploader';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import './AdminProductFormPage.css';

const EMPTY = {
  name: '',
  sku: '',
  category: '',
  shortDescription: '',
  description: '',
  images: [],
  price: '',
  salePrice: '',
  stock: '',
  lowStockThreshold: 10,
  weight: '',
  minWeight: '',
  maxWeight: '',
  weightUnit: 'kg',
  variants: [],
  packaging: '',
  storageInfo: '',
  productionInfo: '',
  recommendedUse: '',
  availability: 'available',
  isFeatured: false,
  isSoldOut: false,
  isActive: true,
  seo: { metaTitle: '', metaDescription: '' },
};

const newVariant = (type) => ({
  key: `${Date.now()}-${Math.random()}`,
  label: '',
  sku: '',
  type,
  minWeight: '',
  maxWeight: '',
  weightUnit: 'kg',
  unitsPerPack: '',
  price: '',
  salePrice: '',
  stock: '',
  reservedStock: 0,
  isActive: true,
});

const blank = (v) => (v === null || v === undefined ? '' : v);

function toForm(product) {
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, blank(product[k] ?? EMPTY[k])])),
    category: product.category?._id || product.category || '',
    images: product.images || [],
    seo: { metaTitle: product.seo?.metaTitle || '', metaDescription: product.seo?.metaDescription || '' },
    variants: (product.variants || []).map((v) => ({
      ...newVariant(v.type),
      ...Object.fromEntries(Object.entries(v).map(([k, val]) => [k, blank(val)])),
      key: v._id,
    })),
  };
}

function toPayload(form) {
  const { variants, ...rest } = form;
  return {
    ...rest,
    variants: variants.map(({ key, reservedStock, ...v }) => v),
  };
}

export default function AdminProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const categories = useFetch(() => adminService.listCategories(), []);
  const uploadsReady = useFetch(() => adminService.uploadStatus(), []);
  const existing = useFetch(() => (isEdit ? adminService.getProduct(id) : Promise.resolve(null)), [id]);

  useEffect(() => {
    if (existing.data) setForm(toForm(existing.data));
  }, [existing.data]);

  const category = categories.data?.find((c) => c._id === form.category);
  const optionType = category?.variantType || 'weight';
  const isPackaging = optionType === 'packaging';

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const setVariant = (index, field, value) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v, i) => (i === index ? { ...v, [field]: value } : v)) }));

  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, newVariant(optionType)] }));

  const duplicateVariant = (index) =>
    setForm((f) => {
      const copy = { ...f.variants[index], _id: undefined, key: `${Date.now()}`, label: `${f.variants[index].label} (copy)`, sku: '', reservedStock: 0 };
      delete copy._id;
      const variants = [...f.variants];
      variants.splice(index + 1, 0, copy);
      return { ...f, variants };
    });

  const removeVariant = (index) => {
    const variant = form.variants[index];
    if (variant.reservedStock > 0) {
      toast.error(`"${variant.label}" has ${variant.reservedStock} unit(s) reserved by pending orders. Disable it instead.`);
      return;
    }
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.category) e.category = 'Choose a category';
    if (!form.variants.length && (form.price === '' || Number(form.price) < 0)) e.price = 'Set a price, or add at least one weight/pack option';
    if (form.salePrice !== '' && form.price !== '' && Number(form.salePrice) >= Number(form.price)) e.salePrice = 'Sale price must be lower than the price';
    if (form.minWeight !== '' && form.maxWeight !== '' && Number(form.minWeight) > Number(form.maxWeight)) e.maxWeight = 'Must be at least the minimum weight';
    form.variants.forEach((v, i) => {
      if (!v.label.trim()) e[`v${i}`] = 'Every option needs a label';
      else if (v.price === '' || Number(v.price) < 0) e[`v${i}`] = `Set a price for "${v.label}"`;
      else if (v.minWeight !== '' && v.maxWeight !== '' && Number(v.minWeight) > Number(v.maxWeight)) e[`v${i}`] = `"${v.label}": minimum weight is above maximum`;
      else if (v.stock !== '' && Number(v.stock) < Number(v.reservedStock || 0)) e[`v${i}`] = `"${v.label}": stock cannot be below the ${v.reservedStock} reserved`;
    });
    setErrors(e);
    return e;
  };

  const save = async (event) => {
    event.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      toast.error(Object.values(e)[0]);
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(form);
      const saved = isEdit ? await adminService.updateProduct(id, payload) : await adminService.createProduct(payload);
      toast.success(isEdit ? 'Product updated' : 'Product created');
      if (isEdit) setForm(toForm(saved));
      else navigate(`/admin/products/${saved._id}/edit`, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && existing.loading) return <PageLoader label="Loading product…" />;
  if (isEdit && existing.error) return <ErrorState message={existing.error} onRetry={existing.reload} />;

  return (
    <form onSubmit={save} noValidate className="product-form">
      <AdminPageHeader
        back={{ to: '/admin/products', label: 'Products' }}
        eyebrow={isEdit ? 'Edit product' : 'New product'}
        title={isEdit ? form.name || 'Edit Product' : 'Create Product'}
        actions={
          <>
            <button type="button" className="btn btn--ghost" onClick={() => navigate('/admin/products')}>
              Cancel
            </button>
            <button type="submit" className="btn btn--accent" disabled={saving}>
              {saving ? <span className="spinner" /> : <Save />} {isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </>
        }
      />

      <div className="product-form__grid">
        <div className="product-form__main">
          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Basic Information</h2>
            </div>
            <div className="admin-card__body form-grid">
              <FormField label="Product name" required error={errors.name} className="span-all">
                <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Fresh Broiler Chicken" />
              </FormField>
              <FormField label="Category" required error={errors.category}>
                <select className="select" value={form.category} onChange={set('category')}>
                  <option value="">Select category</option>
                  {(categories.data || []).map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                      {c.isActive ? '' : ' (disabled)'}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="SKU" hint="Unique stock code, e.g. TGF-BRL-001">
                <input className="input" value={form.sku} onChange={set('sku')} />
              </FormField>
              <FormField label="Short description" hint="Shown on product cards (max 300 characters)" className="span-all">
                <textarea className="textarea" rows={2} maxLength={300} value={form.shortDescription} onChange={set('shortDescription')} />
              </FormField>
              <FormField label="Full description" className="span-all">
                <textarea className="textarea" rows={6} value={form.description} onChange={set('description')} />
              </FormField>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Images</h2>
            </div>
            <div className="admin-card__body">
              {uploadsReady.data === false && (
                <div className="admin-hint" style={{ marginBottom: 16 }}>
                  <Info /> Cloudinary is not configured on the server yet, so images cannot be uploaded. Add the Cloudinary keys to the server .env file.
                </div>
              )}
              <ImageUploader multiple folder="products" label="" value={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} max={12} hint="The first image is the cover. JPG, PNG or WEBP up to 5MB." />
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>{isPackaging ? 'Pack Sizes' : 'Weight / Size Options'}</h2>
              <button type="button" className="btn btn--outline btn--sm" onClick={addVariant}>
                <Plus /> Add {isPackaging ? 'pack size' : 'weight option'}
              </button>
            </div>
            <div className="admin-card__body">
              <div className="admin-hint">
                <Info />
                <span>
                  {isPackaging
                    ? 'Add each pack customers can buy (for example 6 eggs, 12 eggs, 30 eggs, Tray or Bulk) with its own price and stock.'
                    : 'Add each weight band customers can choose (for example 1.5–2.0 kg or 2.0–2.5 kg) with its own price and stock.'}{' '}
                  When options exist, their prices and stock replace the single price and stock below.
                </span>
              </div>

              {form.variants.length > 0 && (
                <div className="variant-list">
                  {form.variants.map((v, index) => (
                    <div key={v.key} className={`variant-row ${v.isActive ? '' : 'is-inactive'}`}>
                      <div className="variant-row__grid">
                        <FormField label="Label" required>
                          <input className="input" value={v.label} onChange={(e) => setVariant(index, 'label', e.target.value)} placeholder={isPackaging ? 'e.g. 30 eggs (crate)' : 'e.g. 2.0–2.5 kg'} />
                        </FormField>
                        {isPackaging ? (
                          <FormField label="Units per pack">
                            <input className="input" type="number" min="1" value={v.unitsPerPack} onChange={(e) => setVariant(index, 'unitsPerPack', e.target.value)} />
                          </FormField>
                        ) : (
                          <>
                            <FormField label="Min weight">
                              <input className="input" type="number" min="0" step="0.01" value={v.minWeight} onChange={(e) => setVariant(index, 'minWeight', e.target.value)} />
                            </FormField>
                            <FormField label="Max weight">
                              <input className="input" type="number" min="0" step="0.01" value={v.maxWeight} onChange={(e) => setVariant(index, 'maxWeight', e.target.value)} />
                            </FormField>
                            <FormField label="Unit">
                              <select className="select" value={v.weightUnit} onChange={(e) => setVariant(index, 'weightUnit', e.target.value)}>
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="lb">lb</option>
                              </select>
                            </FormField>
                          </>
                        )}
                        <FormField label="Price (₦)" required>
                          <input className="input" type="number" min="0" step="0.01" value={v.price} onChange={(e) => setVariant(index, 'price', e.target.value)} />
                        </FormField>
                        <FormField label="Sale price (₦)">
                          <input className="input" type="number" min="0" step="0.01" value={v.salePrice} onChange={(e) => setVariant(index, 'salePrice', e.target.value)} />
                        </FormField>
                        <FormField label="Stock" hint={v.reservedStock > 0 ? `${v.reservedStock} reserved` : undefined}>
                          <input className="input" type="number" min={v.reservedStock || 0} step="1" value={v.stock} onChange={(e) => setVariant(index, 'stock', e.target.value)} />
                        </FormField>
                        <FormField label="SKU">
                          <input className="input" value={v.sku} onChange={(e) => setVariant(index, 'sku', e.target.value)} />
                        </FormField>
                      </div>
                      {errors[`v${index}`] && <span className="field__error">{errors[`v${index}`]}</span>}
                      <div className="variant-row__foot">
                        <label className="switch">
                          <input type="checkbox" checked={v.isActive} onChange={(e) => setVariant(index, 'isActive', e.target.checked)} />
                          <span className="switch__track" /> Available for sale
                        </label>
                        <div className="row">
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => duplicateVariant(index)}>
                            <Copy /> Duplicate
                          </button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeVariant(index)}>
                            <Trash2 /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Pricing, Stock & Weight</h2>
            </div>
            <div className="admin-card__body">
              {form.variants.length > 0 && (
                <p className="field__hint" style={{ marginBottom: 12 }}>
                  This product uses options above; the single price and stock here are not used for sales.
                </p>
              )}
              <div className="form-grid form-grid--3">
                <FormField label="Price (₦)" required={!form.variants.length} error={errors.price}>
                  <input className="input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} />
                </FormField>
                <FormField label="Sale price (₦)" error={errors.salePrice}>
                  <input className="input" type="number" min="0" step="0.01" value={form.salePrice} onChange={set('salePrice')} />
                </FormField>
                <FormField label="Stock" hint={existing.data?.reservedStock ? `${existing.data.reservedStock} reserved` : undefined}>
                  <input className="input" type="number" min="0" step="1" value={form.stock} onChange={set('stock')} />
                </FormField>
                <FormField label="Weight">
                  <input className="input" type="number" min="0" step="0.01" value={form.weight} onChange={set('weight')} />
                </FormField>
                <FormField label="Minimum weight">
                  <input className="input" type="number" min="0" step="0.01" value={form.minWeight} onChange={set('minWeight')} />
                </FormField>
                <FormField label="Maximum weight" error={errors.maxWeight}>
                  <input className="input" type="number" min="0" step="0.01" value={form.maxWeight} onChange={set('maxWeight')} />
                </FormField>
                <FormField label="Weight unit">
                  <select className="select" value={form.weightUnit} onChange={set('weightUnit')}>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                  </select>
                </FormField>
                <FormField label="Low-stock alert at" hint="Flag the product when available stock reaches this number">
                  <input className="input" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} />
                </FormField>
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Product Information</h2>
            </div>
            <div className="admin-card__body form-grid">
              <FormField label="Packaging" className="span-all">
                <textarea className="textarea" rows={3} value={form.packaging} onChange={set('packaging')} />
              </FormField>
              <FormField label="Storage information" className="span-all">
                <textarea className="textarea" rows={3} value={form.storageInfo} onChange={set('storageInfo')} />
              </FormField>
              <FormField label="Production information" className="span-all">
                <textarea className="textarea" rows={3} value={form.productionInfo} onChange={set('productionInfo')} />
              </FormField>
              <FormField label="Recommended use" className="span-all">
                <textarea className="textarea" rows={3} value={form.recommendedUse} onChange={set('recommendedUse')} />
              </FormField>
            </div>
          </section>
        </div>

        <aside className="product-form__side">
          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Visibility</h2>
            </div>
            <div className="admin-card__body stack">
              <label className="switch">
                <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
                <span className="switch__track" /> Product enabled (visible in shop)
              </label>
              <label className="switch">
                <input type="checkbox" checked={form.isFeatured} onChange={set('isFeatured')} />
                <span className="switch__track" /> Featured on homepage
              </label>
              <label className="switch">
                <input type="checkbox" checked={form.isSoldOut} onChange={set('isSoldOut')} />
                <span className="switch__track" /> Mark as sold out
              </label>
              <FormField label="Availability">
                <select className="select" value={form.availability} onChange={set('availability')}>
                  <option value="available">Available</option>
                  <option value="pre_order">Pre-order</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </FormField>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Search Engine (SEO)</h2>
            </div>
            <div className="admin-card__body stack">
              <FormField label="Meta title" hint={`${form.seo.metaTitle.length}/70`}>
                <input className="input" maxLength={70} value={form.seo.metaTitle} onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, metaTitle: e.target.value } }))} />
              </FormField>
              <FormField label="Meta description" hint={`${form.seo.metaDescription.length}/170`}>
                <textarea
                  className="textarea"
                  rows={3}
                  maxLength={170}
                  value={form.seo.metaDescription}
                  onChange={(e) => setForm((f) => ({ ...f, seo: { ...f.seo, metaDescription: e.target.value } }))}
                />
              </FormField>
            </div>
          </section>

          <button type="submit" className="btn btn--accent btn--lg btn--block" disabled={saving}>
            {saving ? <span className="spinner" /> : <Save />} {isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </aside>
      </div>
    </form>
  );
}
