import api from './client.js';

export const getSummary  = () => api.get('/analytics/summary').then(r => r.data);
export const getTrends   = () => api.get('/analytics/trends').then(r => r.data);
export const getRegions  = () => api.get('/analytics/regions').then(r => r.data);
export const getActivity = () => api.get('/analytics/activity').then(r => r.data);