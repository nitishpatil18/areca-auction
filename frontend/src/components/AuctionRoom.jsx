import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Gavel, Clock, Users, Trophy, AlertCircle, Zap, TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket.js';
import * as auctionApi from '../api/auction.js';
import CountdownTimer from './CountdownTimer.jsx';

// relative time: 'just now', '5m ago', '2h ago', '3d ago'
function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5)    return 'just now';
  if (seconds < 60)   return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60)      return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)     return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}


export default function AuctionRoom({ auction: initial, lot }) {
  const { user } = useSelector((s) => s.auth);
  const socketRef = useSocket();

  const [auction, setAuction] = useState(initial);
  const [bids, setBids] = useState([]);
  const [bidInput, setBidInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    auctionApi.bidHistory(auction._id).then((data) => {
      if (!cancelled) setBids(data.items);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [auction._id]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onConnect = () => socket.emit('auction:join', auction._id);
    if (socket.connected) onConnect(); else socket.on('connect', onConnect);

    const onBid = (e) => {
      if (e.auctionId !== auction._id) return;
      const wasMine = e.highestBidder === user?.id;
      const previouslyMine = auction.highestBidder?._id === user?.id;
      setAuction((a) => ({
        ...a,
        currentBidPerKg: e.pricePerKg,
        bidCount: e.bidCount,
        highestBidder: e.highestBidder ? { _id: e.highestBidder, name: wasMine ? user.name : '...' } : null,
      }));
      setBids((b) => [{
        _id: `live-${Date.now()}`,
        pricePerKg: e.pricePerKg,
        amountTotal: e.pricePerKg * lot.weightKg,
        createdAt: e.at,
        bidder: { name: wasMine ? user.name : 'Someone' },
      }, ...b]);

      if (previouslyMine && !wasMine) {
        toast.error('You have been outbid', { icon: '⚡' });
      }
    };

    const onClosed = (e) => {
      if (e.auctionId !== auction._id) return;
      setAuction((a) => ({ ...a, status: 'closed', currentBidPerKg: e.finalPricePerKg, finalAmount: e.finalAmount }));
      const wonByMe = e.winner === user?.id;
      if (wonByMe) {
        toast.success(`You won! ₹${e.finalPricePerKg}/kg · Total ₹${e.finalAmount}`, { duration: 6000 });
      } else {
        toast(`Auction closed at ₹${e.finalPricePerKg}/kg`);
      }
    };

    const onStarted = (e) => {
      if (e.auctionId !== auction._id) return;
      setAuction((a) => ({ ...a, status: 'live', endAt: e.endAt }));
      toast.success('Auction is live', { icon: '🔥' });
    };

    const onExtended = (e) => {
      if (e.auctionId !== auction._id) return;
      setAuction((a) => ({ ...a, endAt: e.endAt }));
      toast('Auction extended · last-second bid', { icon: '🔥', duration: 4000 });
    };

    socket.on('bid:new', onBid);
    socket.on('auction:closed', onClosed);
    socket.on('auction:started', onStarted);
    socket.on('auction:extended', onExtended);

    return () => {
      socket.emit('auction:leave', auction._id);
      socket.off('connect', onConnect);
      socket.off('bid:new', onBid);
      socket.off('auction:closed', onClosed);
      socket.off('auction:started', onStarted);
      socket.off('auction:extended', onExtended);
    };
  }, [auction._id, lot.weightKg, socketRef, user?.id, user?.name, auction.highestBidder?._id]);

  function placeBid(e) {
    e.preventDefault();
    const socket = socketRef.current;
    const pricePerKg = Number(bidInput);
    if (!socket || !pricePerKg) return;
    setBusy(true);
    socket.emit('bid:place', { auctionId: auction._id, pricePerKg }, (resp) => {
      setBusy(false);
      if (resp?.ok) {
        toast.success(`Bid placed at ₹${pricePerKg}/kg`);
        setBidInput('');
      } else {
        toast.error(resp?.error || 'Bid rejected');
      }
    });
  }

  const minNext = Math.max((auction.currentBidPerKg || 0) + 1, auction.basePricePerKg);
  const canBid = user?.role === 'buyer' && auction.status === 'live';
  const isLeading = auction.highestBidder?._id === user?.id;

  const statusLabel = {
    live: 'Live',
    scheduled: 'Scheduled',
    closed: 'Closed',
    cancelled: 'Cancelled',
  }[auction.status] || auction.status;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Gavel size={18} className="text-emerald-600" />
          <h2 className="font-bold text-lg">Live Auction</h2>
        </div>
        <span className={`badge-${auction.status}`}>
          {auction.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />}
          {statusLabel}
        </span>
      </div>

      <BidChart bids={bids} basePricePerKg={auction.basePricePerKg} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Metric icon={Trophy} label="Current Bid" value={`₹${auction.currentBidPerKg || auction.basePricePerKg}`} suffix="/kg" big />
        <Metric icon={Clock}  label={auction.status === 'scheduled' ? 'Starts In' : 'Ends In'}
          value={
            auction.status === 'live'      ? <CountdownTimer endAt={auction.endAt} /> :
            auction.status === 'scheduled' ? <CountdownTimer endAt={auction.startAt} /> :
            'Ended'
          }
        />
        <Metric icon={Users} label="Bids" value={auction.bidCount || 0} />
        <Metric icon={Gavel} label="Leader" value={auction.highestBidder?.name || '—'} />
      </div>

      {isLeading && auction.status === 'live' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4 text-sm text-emerald-800 flex items-center gap-2">
          <Trophy size={16} />
          <span className="font-medium">You are leading this auction</span>
        </div>
      )}

      {canBid ? (
        <>
          <QuickBidChips currentBid={auction.currentBidPerKg || auction.basePricePerKg} onPick={setBidInput} />
        <form onSubmit={placeBid} className="flex gap-2 mb-4">
          <input
            type="number" step="0.01" min={minNext}
            placeholder={`Enter ₹/kg (min ₹${minNext})`}
            value={bidInput}
            onChange={(e) => setBidInput(e.target.value)}
            className="input flex-1"
            required
          />
          <button disabled={busy} className="btn-primary">
            <Zap size={16} />
            {busy ? 'Placing…' : 'Bid'}
          </button>
        </form>
        </>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-4 text-sm text-slate-600 flex items-center gap-2">
          <AlertCircle size={16} />
          {!user                          && 'Sign in as a buyer to place bids'}
          {user?.role === 'farmer'        && 'Farmers cannot place bids'}
          {user?.role === 'admin'         && 'Admins cannot place bids'}
          {user?.role === 'buyer' && auction.status !== 'live' && 'Bidding opens when status is Live'}
        </div>
      )}

      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Bid History</h3>
          <span className="text-xs text-slate-500">{bids.length} total</span>
        </div>
        {bids.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400">No bids yet · be the first</div>
        ) : (
          <ul className="space-y-1.5 max-h-56 overflow-auto">
            {bids.slice(0, 30).map((b, i) => (
              <li key={b._id} className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm ${
                i === 0 ? 'bg-emerald-50' : 'bg-slate-50'
              }`}>
                <span className={i === 0 ? 'font-semibold text-emerald-700 flex items-center gap-1' : 'text-slate-700 flex items-center gap-1'}>
                  {i === 0 && <Trophy size={12} />}
                  {b.bidder?.name || '—'}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{timeAgo(b.createdAt)}</span>
                  <span className="font-mono text-slate-900 font-medium">₹{b.pricePerKg}/kg</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}



function BidChart({ bids, basePricePerKg }) {
  if (!bids || bids.length === 0) return null;
  // bids come newest-first; chart wants oldest-first for left-to-right time flow.
  // prepend base price as the implicit "starting line" so the chart shows the climb.
  const data = [
    { t: 0, price: basePricePerKg, label: 'Base' },
    ...bids.slice().reverse().map((b, i) => ({
      t: i + 1,
      price: b.pricePerKg,
      label: b.bidder?.name || 'Anonymous',
    })),
  ];
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <TrendingUp size={14} />
          Price Trajectory
        </div>
        <span className="text-xs text-slate-500">{bids.length} bid{bids.length !== 1 ? 's' : ''}</span>
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div className="bg-white border border-slate-200 rounded px-2 py-1 text-xs shadow">
                  <div className="font-medium">{p.label}</div>
                  <div className="text-emerald-700 font-mono">₹{p.price}/kg</div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#059669"
            strokeWidth={2}
            dot={{ r: 3, fill: '#059669' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuickBidChips({ currentBid, onPick }) {
  const deltas = [1, 5, 10, 50];
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs text-slate-500 mr-1">Quick bid:</span>
      {deltas.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onPick(String(currentBid + d))}
          className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 transition font-medium"
        >
          +{d}
        </button>
      ))}
    </div>
  );
}

function Metric({ icon: Icon, label, value, suffix, big }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wide mb-1">
        <Icon size={12} /> {label}
      </div>
      <div className={big ? 'text-2xl font-extrabold text-slate-900' : 'text-base font-semibold text-slate-900'}>
        {value}{suffix && <span className="text-sm font-normal text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}