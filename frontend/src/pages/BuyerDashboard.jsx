import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Plus, ShoppingBag, TrendingUp, Lock, Coins, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as auctionApi from '../api/auction.js';
import * as walletApi from '../api/wallet.js';

export default function BuyerDashboard() {
  const [auctions, setAuctions] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([
      auctionApi.listAuctions({ status: 'live' }),
      auctionApi.listAuctions({ status: 'scheduled' }),
      walletApi.getWallet(),
    ])
      .then(([live, scheduled, w]) => {
        setAuctions([...live.items, ...scheduled.items]);
        setWallet(w);
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
          <ShoppingBag size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Buyer Dashboard</h1>
          <p className="text-sm text-slate-500">Browse auctions, place bids, manage your wallet</p>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <WalletStat label="Balance"   value={wallet?.balance}   icon={Coins}      color="bg-emerald-100 text-emerald-700" />
        <WalletStat label="Held"      value={wallet?.held}      icon={Lock}       color="bg-amber-100 text-amber-700" />
        <WalletStat label="Available" value={wallet?.available} icon={TrendingUp} color="bg-blue-100 text-blue-700" />
      </section>

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
      </section>

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

function WalletStat({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-extrabold">
        ₹{value != null ? value.toLocaleString() : '—'}
      </div>
    </div>
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