import api from './client.js';

export const getWallet = ()      => api.get('/wallet').then(r => r.data);
export const topUp     = (amount) => api.post('/wallet/topup', { amount }).then(r => r.data);
export const getTransactions = (page = 1, limit = 20) => api.get(`/wallet/transactions?page=${page}&limit=${limit}`).then(r => r.data);
