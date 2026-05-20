import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Gavel, Clock, Users, Trophy, AlertCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../hooks/useSocket.js';
import * as auctionApi from '../api/auction.js';
import CountdownTimer from './CountdownTimer.jsx';

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
                <span className={i === 0 ? 'font-semibold text-emerald-700' : 'text-slate-700'}>
                  {i === 0 && <Trophy size={12} className="inline mr-1" />}
                  {b.bidder?.name || '—'}
                </span>
                <span className="font-mono text-slate-900 font-medium">₹{b.pricePerKg}/kg</span>
              </li>
            ))}
          </ul>
        )}
      </div>
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