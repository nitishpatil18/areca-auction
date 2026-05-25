import api from './client.js';

export const register = (data) => api.post('/auth/register', data).then(r => r.data);
export const login    = (data) => api.post('/auth/login', data).then(r => r.data);
export const me       = ()      => api.get('/auth/me').then(r => r.data);

export const forgotPassword = (email) => api.post('/auth/forgot-password', { email }).then(r => r.data);
export const resetPassword = (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }).then(r => r.data);
