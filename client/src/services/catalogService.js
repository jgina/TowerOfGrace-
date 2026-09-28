import api from './api';

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false));

export const catalogService = {
  listProducts: (params) => api.get('/products', { params: clean(params) }).then((r) => r.data),
  getFilters: () => api.get('/products/filters').then((r) => r.data),
  getProduct: (slug) => api.get(`/products/${encodeURIComponent(slug)}`).then((r) => r.data),
  listCategories: (params) => api.get('/categories', { params }).then((r) => r.data.categories),
};
