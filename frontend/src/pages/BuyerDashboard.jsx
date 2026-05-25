import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Plus, ShoppingBag, TrendingUp, Lock, Coins, ArrowRight,
  Trophy, Activity, Target, IndianRupee, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as auctionApi from '../api/auction.js';
import * as walletApi from '../api/wallet.js';

export default function BuyerDashboard() {
  const [auctions, setAuctions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [bids, setBids] = useState([]);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([
      auctionApi.listAuctions({ status: 'live' }),
      auctionApi.listAuctions({ status: 'scheduled' }),
      walletApi.getWallet(),
      auctionApi.myBids(),
    ])
      .then(([live, scheduled, w, b]) => {
        setAuctions([...live.items, ...scheduled.items]);
        setWallet(w);
        setBids(b.items || []);
      })
      .catch((e) => toast.error(e.message));
  }, [refreshKey]);

  async function doTopUp(e) {
    e.preventDefault();
    try {
      const r = await walletApi.topUp(Number(topUpAmount));
      toast.success(`Added ₹${topUpAmount} · Balance ₹${r.balance}`);
      setTopUpAmount('');
      setRefreshKey((k) => k + 1);
    } catch (e) { toast.error(e.message); }
  }

  // group bids by status. for live auctions, keep only the most recent bid per auction
  // (so a user with many bids on the same auction is shown once).
  const { active, won, lost, totalSpent } = useMemo(() => {
    const seen = new Set();
    const active = [];
    const won = [];
    const lost = [];
    let totalSpent = 0;

    for (const b of bids) {
      const aid = b.auction?._id;
      if (!aid) continue;

      if (b.status === 'winning' || b.status === 'outbid') {
        if (!seen.has(aid)) { active.push(b); seen.add(aid); }
      } else if (b.status === 'won') {
        if (!seen.has(aid)) {
          won.push(b);
          seen.add(aid);
          totalSpent += b.auction.finalAmount || 0;
        }
      } else if (b.status === 'lost') {
        if (!seen.has(aid)) { lost.push(b); seen.add(aid); }
      }
    }

    return { active, won, lost, totalSpent };
  }, [bids]);

  const leadingCount = active.filter((b) => b.status === 'winning').length;
  const outbidCount = active.filter((b) => b.status === 'outbid').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
          <ShoppingBag size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Buyer Dashboard</h1>
          <p className="text-sm text-slate-500">Track your bids, wins, and wallet</p>
        </div>
      </div>

      {/* stats row */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <BigStat icon={Coins}       label="Balance"     value={`₹${(wallet?.balance ?? 0).toLocaleString('en-IN')}`} tone="emerald" />
        <BigStat icon={Lock}        label="Held"        value={`₹${(wallet?.held ?? 0).toLocaleString('en-IN')}`} tone="amber" />
        <BigStat icon={IndianRupee} label="Total Spent" value={`₹${totalSpent.toLocaleString('en-IN')}`} tone="blue" />
        <BigStat icon={Trophy}      label="Lots Won"    value={won.length} tone="green" />
        <BigStat icon={Activity}    label="Leading"     value={leadingCount} tone="emerald" />
        <BigStat icon={Target}      label="Outbid"      value={outbidCount} tone={outbidCount > 0 ? 'red' : 'slate'} />
      </section>

      {/* active bids */}
      {active.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-slate-500" />
              <h2 className="text-lg font-semibold">My Active Bids</h2>
              <span className="text-xs text-slate-500">({active.length})</span>
            </div>
            {outbidCount > 0 && (
              <span className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} /> {outbidCount} outbid · place new bid
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {active.map((b) => <ActiveBidCard key={b._id} bid={b} />)}
          </div>
        </section>
      )}

      {/* won lots */}
      {won.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-emerald-600" />
            <h2 className="text-lg font-semibold">Recent Wins</h2>
            <span className="text-xs text-slate-500">({won.length})</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {won.slice(0, 4).map((b) => <WonLotCard key={b._id} bid={b} />)}
          </div>
        </section>
      )}

      {/* wallet topup */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Wallet size={18} /> Add Funds
        </h2>
        <form onSubmit={doTopUp} className="flex gap-2">
          <input
            type="number" min="1"
            placeholder="Amount in ₹ (mock payment)"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            className="input flex-1"
            required
          />
          <button className="btn-primary"><Plus size={16} /> Top Up</button>
        </form>
        <p className="text-xs text-slate-500 mt-2">
          Tip: typical bid needs ~₹35,000 for a 100kg lot at ₹350/kg
        </p>
      </section>

      {/* live & upcoming auctions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Live & Upcoming Auctions</h2>
          <span className="text-sm text-slate-500">{auctions.length} total</span>
        </div>
        {auctions.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            No active auctions right now.
            <Link to="/lots" className="block mt-2 text-emerald-600 font-medium hover:underline">
              Browse all lots →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {auctions.map((a) => <AuctionRowCard key={a._id} a={a} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function BigStat({ icon: Icon, label, value, tone }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber:   'bg-amber-50 text-amber-700',
    blue:    'bg-blue-50 text-blue-700',
    green:   'bg-green-50 text-green-700',
    red:     'bg-red-50 text-red-700',
    slate:   'bg-slate-50 text-slate-700',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase font-medium">{label}</span>
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${tones[tone]}`}>
          <Icon size={14} />
        </div>
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ActiveBidCard({ bid }) {
  const isWinning = bid.status === 'winning';
  const auction = bid.auction;
  return (
    <Link to={`/lots/${auction.lot?._id}`} className="card p-4 hover:shadow-md hover:border-emerald-200 transition group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold text-sm">{auction.lot?.variety} · Grade {auction.lot?.grade}</div>
          <div className="text-xs text-slate-500 mt-0.5">{auction.lot?.weightKg}kg · {auction.lot?.region}</div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isWinning ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}>
          {isWinning ? '✓ Leading' : '! Outbid'}
        </span>
      </div>
      <div className="flex justify-between items-end pt-3 border-t border-slate-100">
        <div>
          <div className="text-xs text-slate-500">Your bid</div>
          <div className="text-lg font-bold">₹{bid.pricePerKg}/kg</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 text-right">Current</div>
          <div className={`text-lg font-bold text-right ${isWinning ? 'text-emerald-700' : 'text-red-600'}`}>
            ₹{auction.currentBidPerKg}/kg
          </div>
        </div>
      </div>
    </Link>
  );
}

function WonLotCard({ bid }) {
  const auction = bid.auction;
  return (
    <Link to={`/lots/${auction.lot?._id}`} className="card p-4 hover:shadow-md hover:border-emerald-200 transition group">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-bold text-sm">{auction.lot?.variety} · Grade {auction.lot?.grade}</div>
          <div className="text-xs text-slate-500 mt-0.5">{auction.lot?.weightKg}kg · {auction.lot?.region}</div>
        </div>
        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
          <Trophy size={10} className="inline" /> Won
        </span>
      </div>
      <div className="flex justify-between items-end pt-3 border-t border-slate-100">
        <div>
          <div className="text-xs text-slate-500">Final price</div>
          <div className="text-lg font-bold text-emerald-700">₹{auction.currentBidPerKg}/kg</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Total paid</div>
          <div className="text-lg font-bold">₹{(auction.finalAmount || 0).toLocaleString('en-IN')}</div>
        </div>
      </div>
    </Link>
  );
}

function AuctionRowCard({ a }) {
  const statusLabel = {
    live: 'Live',
    scheduled: 'Scheduled',
    closed: 'Closed',
    cancelled: 'Cancelled',
  }[a.status] || a.status;

  return (
    <Link to={`/lots/${a.lot?._id}`} className="card p-4 hover:shadow-md hover:border-emerald-200 transition group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-bold">{a.lot?.variety} · Grade {a.lot?.grade}</div>
          <div className="text-xs text-slate-500 mt-0.5">{a.lot?.weightKg}kg · {a.lot?.region}</div>
        </div>
        <span className={`badge-${a.status}`}>
          {a.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />}
          {statusLabel}
        </span>
      </div>
      <div className="flex justify-between items-end pt-3 border-t border-slate-100">
        <div>
          <div className="text-xs text-slate-500">Current Bid</div>
          <div className="text-xl font-bold text-emerald-700">₹{a.currentBidPerKg || a.basePricePerKg}<span className="text-sm text-slate-500 font-normal">/kg</span></div>
          <div className="text-xs text-slate-500 mt-0.5">{a.bidCount} bids</div>
        </div>
        <div className="text-emerald-600 group-hover:translate-x-1 transition-transform"><ArrowRight size={16} /></div>
      </div>
    </Link>
  );
}
