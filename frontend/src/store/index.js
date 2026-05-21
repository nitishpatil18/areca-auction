import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice.js';
import wallet from './walletSlice.js';

export const store = configureStore({
  reducer: { auth, wallet },
});