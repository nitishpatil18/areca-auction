import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice.js';
import wallet from './walletSlice.js';
import notifications from './notificationsSlice.js';

export const store = configureStore({
  reducer: { auth, wallet, notifications },
});