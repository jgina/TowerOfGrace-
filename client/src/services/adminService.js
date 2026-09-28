import api from './api';

const data = (r) => r.data;

export const adminService = {
  dashboard: () => api.get('/admin/dashboard').then(data),

  // Notifications
  notifications: (params) => api.get('/admin/notifications', { params }).then(data),
  markNotificationRead: (id) => api.patch(`/admin/notifications/${id}/read`).then(data),
  markAllNotificationsRead: () => api.post('/admin/notifications/read-all').then(data),

  // Uploads
  uploadStatus: () => api.get('/admin/uploads/status').then((r) => r.data.configured),
  uploadImages: (files, folder, onProgress) => {
    const form = new FormData();
    [...files].forEach((file) => form.append('images', file));
    return api
      .post(`/admin/uploads?folder=${encodeURIComponent(folder)}`, form, {
        timeout: 120000,
        onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data.images);
  },
  deleteUpload: (publicId) => api.delete('/admin/uploads', { data: { publicId } }).then(data),

  // Products
  listProducts: (params) => api.get('/admin/products', { params }).then(data),
  getProduct: (id) => api.get(`/admin/products/${id}`).then((r) => r.data.product),
  createProduct: (payload) => api.post('/admin/products', payload).then((r) => r.data.product),
  updateProduct: (id, payload) => api.put(`/admin/products/${id}`, payload).then((r) => r.data.product),
  patchProduct: (id, payload) => api.patch(`/admin/products/${id}`, payload).then((r) => r.data.product),
  deleteProduct: (id) => api.delete(`/admin/products/${id}`).then(data),

  // Categories
  listCategories: () => api.get('/categories', { params: { all: 'true' } }).then((r) => r.data.categories),
  createCategory: (payload) => api.post('/categories', payload).then((r) => r.data.category),
  updateCategory: (id, payload) => api.put(`/categories/${id}`, payload).then((r) => r.data.category),
  deleteCategory: (id) => api.delete(`/categories/${id}`).then(data),

  // Inventory
  inventory: (params) => api.get('/admin/inventory', { params }).then(data),
  updateInventory: (productId, payload) => api.patch(`/admin/inventory/${productId}`, payload).then(data),

  // Mortality & losses
  listLosses: (params) => api.get('/admin/stock-losses', { params }).then(data),
  recordLoss: (payload) => api.post('/admin/stock-losses', payload).then(data),
  reverseLoss: (id, note) => api.post(`/admin/stock-losses/${id}/reverse`, { note }).then(data),

  // Orders
  listOrders: (params) => api.get('/admin/orders', { params }).then(data),
  getOrder: (id) => api.get(`/admin/orders/${id}`).then((r) => r.data.order),
  updateOrderStatus: (id, status, note) => api.patch(`/admin/orders/${id}/status`, { status, note }).then((r) => r.data.order),
  updatePaymentStatus: (id, paymentStatus, note) =>
    api.patch(`/admin/orders/${id}/payment`, { paymentStatus, note }).then((r) => r.data.order),
  confirmPayment: (id, note) => api.post(`/admin/orders/${id}/confirm-payment`, { note }).then(data),
  rejectPaymentProof: (id, reason) => api.post(`/admin/orders/${id}/reject-proof`, { reason }).then(data),
  recheckPayment: (id) => api.post(`/admin/orders/${id}/recheck-payment`).then((r) => r.data.order),
  addOrderNote: (id, note) => api.post(`/admin/orders/${id}/notes`, { note }).then((r) => r.data.order),

  // Customers
  listCustomers: (params) => api.get('/admin/customers', { params }).then(data),
  getCustomer: (id) => api.get(`/admin/customers/${id}`).then(data),
  setCustomerStatus: (id, isActive) => api.patch(`/admin/customers/${id}/status`, { isActive }).then(data),

  // Content
  getContent: (key) => api.get(`/content/${key}`).then(data),
  saveContent: (key, payload) => api.put(`/admin/content/${key}`, { data: payload }).then(data),

  // Gallery
  listGallery: (params) => api.get('/gallery', { params }).then(data),
  createGalleryItem: (payload) => api.post('/admin/gallery', payload).then((r) => r.data.item),
  updateGalleryItem: (id, payload) => api.put(`/admin/gallery/${id}`, payload).then((r) => r.data.item),
  deleteGalleryItem: (id) => api.delete(`/admin/gallery/${id}`).then(data),

  // Certifications
  listCertifications: () => api.get('/admin/certifications').then((r) => r.data.certifications),
  createCertification: (payload) => api.post('/admin/certifications', payload).then((r) => r.data.certification),
  updateCertification: (id, payload) => api.put(`/admin/certifications/${id}`, payload).then((r) => r.data.certification),
  deleteCertification: (id) => api.delete(`/admin/certifications/${id}`).then(data),

  // Enquiries
  listMessages: (params) => api.get('/admin/messages', { params }).then(data),
  updateMessage: (id, payload) => api.patch(`/admin/messages/${id}`, payload).then(data),
  deleteMessage: (id) => api.delete(`/admin/messages/${id}`).then(data),
  listBulkOrders: (params) => api.get('/admin/bulk-orders', { params }).then(data),
  updateBulkOrder: (id, payload) => api.patch(`/admin/bulk-orders/${id}`, payload).then(data),
  deleteBulkOrder: (id) => api.delete(`/admin/bulk-orders/${id}`).then(data),
};
