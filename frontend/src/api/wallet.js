import api from './client.js';

export const getWallet = ()      => api.get('/wallet').then(r => r.data);
export const topUp     = (amount) => api.post('/wallet/topup', { amount }).then(r => r.data);