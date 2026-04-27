import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authApi from '../api/auth.js';

export const loginThunk = createAsyncThunk('auth/login', (data) => authApi.login(data));
export const registerThunk = createAsyncThunk('auth/register', (data) => authApi.register(data));
export const meThunk = createAsyncThunk('auth/me', () => authApi.me());

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (b) => {
    const handleAuth = (state, { payload }) => {
      state.user = payload.user;
      state.token = payload.token;
      state.status = 'idle';
      state.error = null;
      localStorage.setItem('token', payload.token);
    };

    b.addCase(loginThunk.pending,    (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(loginThunk.fulfilled,  handleAuth);
    b.addCase(loginThunk.rejected,   (s, a) => { s.status = 'idle'; s.error = a.error.message; });

    b.addCase(registerThunk.pending, (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(registerThunk.fulfilled, handleAuth);
    b.addCase(registerThunk.rejected,(s, a) => { s.status = 'idle'; s.error = a.error.message; });

    b.addCase(meThunk.fulfilled, (s, { payload }) => { s.user = payload.user; });
    b.addCase(meThunk.rejected,  (s) => { // token expired/invalid
      s.user = null;
      s.token = null;
      localStorage.removeItem('token');
    });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;