import api from './client.js';

export const publicStats     = () => api.get('/public/stats').then((r) => r.data);
export const featuredAuction = () => api.get('/public/featured-auction').then((r) => r.data);
