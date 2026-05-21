import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as walletApi from '../api/wallet.js';

// thunks
export const fetchStatusThunk = createAsyncThunk(
  'wallet/fetchStatus',
  () => walletApi.getWallet(),
);

export const topUpThunk = createAsyncThunk(
  'wallet/topUp',
  (amount) => walletApi.topUp(amount),
);

export const fetchTransactionsThunk = createAsyncThunk(
  'wallet/fetchTransactions',
  ({ page = 1, limit = 20 } = {}) => walletApi.getTransactions(page, limit),
);

const initialState = {
  balance: 0,
  held: 0,
  available: 0,
  transactions: [],
  txPage: 1,
  txTotalPages: 0,
  txTotal: 0,
  status: 'idle',
  txStatus: 'idle',
  error: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    resetWallet: () => initialState,
  },
  extraReducers: (b) => {
    // fetchStatus
    b.addCase(fetchStatusThunk.pending,   (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(fetchStatusThunk.fulfilled, (s, { payload }) => {
      s.balance = payload.balance;
      s.held = payload.held;
      s.available = payload.available;
      s.status = 'idle';
    });
    b.addCase(fetchStatusThunk.rejected,  (s, a) => { s.status = 'idle'; s.error = a.error.message; });

    // topUp
    b.addCase(topUpThunk.pending,   (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(topUpThunk.fulfilled, (s, { payload }) => {
      s.balance = payload.balance;
      s.available = payload.balance - s.held;
      s.status = 'idle';
    });
    b.addCase(topUpThunk.rejected,  (s, a) => { s.status = 'idle'; s.error = a.error.message; });

    // fetchTransactions
    b.addCase(fetchTransactionsThunk.pending,   (s) => { s.txStatus = 'loading'; });
    b.addCase(fetchTransactionsThunk.fulfilled, (s, { payload }) => {
      s.transactions = payload.items;
      s.txPage = payload.page;
      s.txTotalPages = payload.totalPages;
      s.txTotal = payload.total;
      s.txStatus = 'idle';
    });
    b.addCase(fetchTransactionsThunk.rejected,  (s) => { s.txStatus = 'idle'; });
  },
});

export const { resetWallet } = walletSlice.actions;
export default walletSlice.reducer;
