import api from './client.js';

export const getSummary  = () => api.get('/analytics/summary').then(r => r.data);
export const getTrends   = (days) => api.get('/analytics/trends', { params: { days } }).then(r => r.data);
export const getRegions  = () => api.get('/analytics/regions').then(r => r.data);
export const getActivity = (days) => api.get('/analytics/activity', { params: { days } }).then(r => r.data);
export const getStatusMix = () => api.get('/analytics/status-mix').then(r => r.data);
export const getInsights  = () => api.get('/analytics/insights').then(r => r.data);
