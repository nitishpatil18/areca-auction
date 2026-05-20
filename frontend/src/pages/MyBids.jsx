import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, X, Clock, Flame, Ban, ArrowRight, Gavel, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as auctionApi from '../api/auction.js';

const STATUS_CONFIG = {
  winning:   { label: 'Winning',   icon: Flame,    cls: 'bg-emerald-100 text-emerald-700' },
  outbid:    { label: 'Outbid',    icon: X,        cls: 'bg-amber-100 text-amber-700' },
  won:       { label: 'Won',       icon: Trophy,   cls: 'bg-emerald-100 text-emerald-700' },
  lost:      { label: 'Lost',      icon: X,        cls: 'bg-slate-200 text-slate-600' },
  cancelled: { label: 'Cancelled', icon: Ban,      cls: 'bg-red-100 text-red-700' },
  pending:   { label: 'Pending',   icon: Clock,    cls: 'bg-blue-100 text-blue-700' },
  unknown:   { label: '—',         icon: Clock,    cls: 'bg-slate-100 text-slate-600' },
};

export default function MyBids() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auctionApi.myBids()
      .then((d) => setItems(d.items))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'
    ? items
    : items.filter((b) => b.status === filter);

  const counts = items.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
          <Gavel size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Bids</h1>
          <p className="text-sm text-slate-500">Every bid you've placed</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Pill label="All"     count={items.length}        active={filter === 'all'}     onClick={() => setFilter('all')} />
        <Pill label="Winning" count={counts.winning || 0} active={filter === 'winning'} onClick={() => setFilter('winning')} cls="text-emerald-700" />
        <Pill label="Outbid"  count={counts.outbid  || 0} active={filter === 'outbid'}  onClick={() => setFilter('outbid')}  cls="text-amber-700" />
        <Pill label="Won"     count={counts.won     || 0} active={filter === 'won'}     onClick={() => setFilter('won')}     cls="text-emerald-700" />
        <Pill label="Lost"    count={counts.lost    || 0} active={filter === 'lost'}    onClick={() => setFilter('lost')}    cls="text-slate-600" />
      </div>

      {loading ? (
        <div className="card p-8 text-center text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Gavel size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">
            {filter === 'all'
              ? "You haven't placed any bids yet."
              : `No bids in '${filter}' status.`}
          </p>
          {filter === 'all' && (
            <Link to="/lots" className="btn-primary mt-4 inline-flex">
              Browse Lots <ArrowRight size={16} />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => <BidRow key={b._id} bid={b} />)}
        </div>
      )}
    </div>
  );
}

function Pill({ label, count, active, onClick, cls = '' }) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition ${
        active
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className={`text-xs uppercase font-medium ${cls || 'text-slate-500'}`}>{label}</div>
      <div className="text-2xl font-bold mt-0.5">{count}</div>
    </button>
  );
}

function BidRow({ bid }) {
  const cfg = STATUS_CONFIG[bid.status] || STATUS_CONFIG.unknown;
  const Icon = cfg.icon;
  const lot = bid.auction?.lot;
  const nav = useNavigate();

  async function dl(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await auctionApi.downloadInvoice(bid.auction._id);
      toast.success('Invoice downloaded');
    } catch (e) {
      toast.error(e.message);
    }
  }

  function openLot() {
    if (lot?._id) nav(`/lots/${lot._id}`);
  }

  return (
    <div
      onClick={openLot}
      className="card p-4 flex items-center gap-4 hover:shadow-md hover:border-emerald-200 transition group cursor-pointer"
    >
      <div className={`w-10 h-10 rounded-lg ${cfg.cls} flex items-center justify-center shrink-0`}>
        <Icon size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">{lot?.variety || '—'}</span>
          {lot?.grade && <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono">Grade {lot.grade}</span>}
          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {lot?.weightKg && `${lot.weightKg}kg · `}{lot?.region || '—'} ·{' '}
          {new Date(bid.createdAt).toLocaleString()}
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-xs text-slate-500">Your Bid</div>
        <div className="text-lg font-bold">₹{bid.pricePerKg}<span className="text-sm font-normal text-slate-500">/kg</span></div>
        <div className="text-xs text-slate-500">Total ₹{bid.amountTotal.toLocaleString()}</div>
      </div>

      {bid.status === 'won' && (
        <button onClick={dl} className="btn-primary text-xs shrink-0" title="Download Invoice">
          <FileDown size={14} /> Invoice
        </button>
      )}

      <ArrowRight size={16} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition" />
    </div>
  );
}