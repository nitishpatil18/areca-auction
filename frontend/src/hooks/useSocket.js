import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

// returns a stable socket instance authed with the current jwt.
// auto-reconnects when token changes.
export function useSocket() {
  const token = useSelector((s) => s.auth.token);
  const ref = useRef(null);

  useEffect(() => {
    if (!token) return;

    const url = import.meta.env.VITE_SOCKET_URL || undefined;
    const socket = io(url, {
      auth: { token },
      transports: ['websocket'],
    });
    ref.current = socket;

    return () => {
      socket.disconnect();
      ref.current = null;
    };
  }, [token]);

  return ref;
}