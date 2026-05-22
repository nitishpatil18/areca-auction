import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications.js';

// relative time helper (duplicated here to keep this component self-contained)
function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const { items, unread, fetch, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const nav = useNavigate();

  // initial fetch + refresh on open
  useEffect(() => { fetch().catch(() => {}); }, []); // eslint-disable-line

  // close on outside click
  useEffect(() => {
    if (!open) return;
    // register on next tick so the opening click doesn't immediately close us
    let cleanup;
    const t = setTimeout(() => {
      function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
      document.addEventListener('mousedown', onClickOutside);
      cleanup = () => document.removeEventListener('mousedown', onClickOutside);
    }, 0);
    return () => { clearTimeout(t); cleanup?.(); };
  }, [open]);

  function handleItemClick(n) {
    if (!n.read) markRead(n._id).catch(() => {});
    if (n.link) {
      setOpen(false);
      nav(n.link);
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) fetch().catch(() => {}); }}
        className="relative w-9 h-9 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-lg z-[100] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAllRead().catch(() => {})}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400">
                No notifications yet
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition ${
                    n.read ? 'bg-white' : 'bg-emerald-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                        <p className="font-medium text-sm text-slate-900 truncate">{n.title}</p>
                      </div>
                      {n.body && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
