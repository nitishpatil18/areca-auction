import api from './client.js';

export const getStats        = ()        => api.get('/admin/stats').then(r => r.data);
export const listUsers       = ()        => api.get('/admin/users').then(r => r.data);
export const setUserRole     = (id, r)   => api.patch(`/admin/users/${id}/role`, { role: r }).then(r => r.data);
export const listAuctions    = ()        => api.get('/admin/auctions').then(r => r.data);
export const forceCloseAuction = (id)    => api.post(`/admin/auctions/${id}/close`).then(r => r.data);export const listFailedSettlements = () => api.get('/admin/failed-settlements').then(r => r.data);
export const listPendingPasswordResets = () => api.get('/admin/pending-password-resets').then(r => r.data);
