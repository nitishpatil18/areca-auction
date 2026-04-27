import { useEffect, useState } from 'react';

export default function CountdownTimer({ endAt, onEnd }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  if (!endAt) return <span className="text-slate-400">—</span>;
  const ms = new Date(endAt).getTime() - now;

  if (ms <= 0) {
    if (onEnd) onEnd();
    return <span className="text-red-600 font-mono">ended</span>;
  }

  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return (
    <span className="font-mono">
      {h > 0 ? `${h}h ` : ''}{m}m {sec.toString().padStart(2, '0')}s
    </span>
  );
}