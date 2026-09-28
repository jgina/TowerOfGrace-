import api from './api';

export const orderService = {
  create: (payload) => api.post('/orders', payload).then((r) => r.data.order),
  track: (orderNumber, email) => api.get('/orders/track', { params: { orderNumber, email } }).then((r) => r.data.order),
  mine: (params) => api.get('/orders/mine', { params }).then((r) => r.data),
  getMine: (id) => api.get(`/orders/mine/${id}`).then((r) => r.data.order),
  cancelMine: (id) => api.post(`/orders/mine/${id}/cancel`).then((r) => r.data.order),

  // Tells the farm a bank transfer was made. The receipt file is optional.
  uploadPaymentProof: ({ orderNumber, email, file, note, senderName, transferDate }, onProgress) => {
    const form = new FormData();
    form.append('orderNumber', orderNumber);
    form.append('email', email);
    if (note) form.append('note', note);
    if (senderName) form.append('senderName', senderName);
    if (transferDate) form.append('transferDate', transferDate);
    if (file) form.append('receipt', file);
    return api
      .post('/orders/payment-proof', form, {
        timeout: 120000,
        onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
      })
      .then((r) => r.data);
  },

  paymentConfig: () => api.get('/payments/config').then((r) => r.data),
  initializePayment: (orderId, email) => api.post('/payments/initialize', { orderId, email }).then((r) => r.data),
  verifyPayment: (reference) => api.get('/payments/verify', { params: { reference } }).then((r) => r.data.order),
};
