import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../api/notifications.js';

// thunks
export const fetchNotificationsThunk = createAsyncThunk(
  'notifications/fetchMine',
  ({ page = 1, unreadOnly = false } = {}) => api.getMine(page, unreadOnly),
);

export const markReadThunk = createAsyncThunk(
  'notifications/markRead',
  (id) => api.markRead(id).then(() => id),
);

export const markAllReadThunk = createAsyncThunk(
  'notifications/markAllRead',
  () => api.markAllRead(),
);

const initialState = {
  items: [],
  unread: 0,
  total: 0,
  page: 1,
  totalPages: 0,
  status: 'idle',
  error: null,
};

const slice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // real-time prepend from socket
    notificationReceived(state, { payload }) {
      // avoid dup if we already have this id
      if (state.items.find((n) => n._id === payload._id)) return;
      state.items = [payload, ...state.items].slice(0, 50);
      state.unread += 1;
      state.total += 1;
    },
    resetNotifications: () => initialState,
  },
  extraReducers: (b) => {
    b.addCase(fetchNotificationsThunk.pending,   (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(fetchNotificationsThunk.fulfilled, (s, { payload }) => {
      s.items = payload.items;
      s.unread = payload.unread;
      s.total = payload.total;
      s.page = payload.page;
      s.totalPages = payload.totalPages;
      s.status = 'idle';
    });
    b.addCase(fetchNotificationsThunk.rejected,  (s, a) => { s.status = 'idle'; s.error = a.error.message; });

    b.addCase(markReadThunk.fulfilled, (s, { payload: id }) => {
      const n = s.items.find((x) => x._id === id);
      if (n && !n.read) { n.read = true; s.unread = Math.max(0, s.unread - 1); }
    });

    b.addCase(markAllReadThunk.fulfilled, (s) => {
      s.items.forEach((n) => { n.read = true; });
      s.unread = 0;
    });
  },
});

export const { notificationReceived, resetNotifications } = slice.actions;
export default slice.reducer;
