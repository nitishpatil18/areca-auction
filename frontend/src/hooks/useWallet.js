import { useDispatch, useSelector } from 'react-redux';
import {
  fetchStatusThunk,
  topUpThunk,
  fetchTransactionsThunk,
} from '../store/walletSlice.js';

export function useWallet() {
  const dispatch = useDispatch();
  const wallet = useSelector((s) => s.wallet);

  return {
    ...wallet,
    fetchStatus: () => dispatch(fetchStatusThunk()).unwrap(),
    topUp: (amount) => dispatch(topUpThunk(amount)).unwrap(),
    fetchTransactions: (opts) => dispatch(fetchTransactionsThunk(opts)).unwrap(),
  };
}
