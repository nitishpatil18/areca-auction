import api from './client.js';

export const getMine     = (page = 1, unreadOnly = false) =>
  api.get(`/notifications?page=${page}&unread=${unreadOnly}`).then(r => r.data);

export const markRead    = (id) =>
  api.patch(`/notifications/${id}/read`).then(r => r.data);

export const markAllRead = () =>
  api.post('/notifications/read-all').then(r => r.data);
