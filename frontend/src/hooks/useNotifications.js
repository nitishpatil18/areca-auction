import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotificationsThunk,
  markReadThunk,
  markAllReadThunk,
} from '../store/notificationsSlice.js';

export function useNotifications() {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.notifications);

  return {
    ...state,
    fetch:        (opts) => dispatch(fetchNotificationsThunk(opts)).unwrap(),
    markRead:     (id)   => dispatch(markReadThunk(id)).unwrap(),
    markAllRead:  ()     => dispatch(markAllReadThunk()).unwrap(),
  };
}
