import api from './api';

export const authService = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  logout: () => api.post('/auth/logout').catch(() => null),
  me: () => api.get('/auth/me').then((r) => r.data.user),
  updateProfile: (payload) => api.patch('/auth/me', payload).then((r) => r.data.user),
  changePassword: (payload) => api.patch('/auth/password', payload).then((r) => r.data),

  listAddresses: () => api.get('/users/me/addresses').then((r) => r.data.addresses),
  addAddress: (payload) => api.post('/users/me/addresses', payload).then((r) => r.data.addresses),
  updateAddress: (id, payload) => api.put(`/users/me/addresses/${id}`, payload).then((r) => r.data.addresses),
  deleteAddress: (id) => api.delete(`/users/me/addresses/${id}`).then((r) => r.data.addresses),
};
