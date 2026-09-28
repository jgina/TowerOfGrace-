import api from './api';

export const siteService = {
  getContent: () => api.get('/content').then((r) => r.data.content),
  getGallery: (params) => api.get('/gallery', { params }).then((r) => r.data),
  getCertifications: () => api.get('/certifications').then((r) => r.data.certifications),
  sendContact: (payload) => api.post('/contact', payload).then((r) => r.data),
  sendBulkOrder: (payload) => api.post('/bulk-orders', payload).then((r) => r.data),
};
