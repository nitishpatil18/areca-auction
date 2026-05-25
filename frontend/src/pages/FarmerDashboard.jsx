import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, Calendar, Tractor, Package, Tag, Scale, MapPin, Droplets,
  FileDown, Image as ImageIcon, TrendingUp, IndianRupee, Activity, ShoppingBag,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import * as lotApi from '../api/lot.js';
import LotImageManager from '../components/LotImageManager.jsx';
import * as auctionApi from '../api/auction.js';

export default function FarmerDashboard() {
  const [lots, setLots] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([lotApi.myLots(), auctionApi.listAuctions()])
      .then(([lotsData, auctionsData]) => {
        setLots(lotsData.items);
        setAuctions(auctionsData.items);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // derived stats
  const { totalEarned, soldCount, listedCount, liveCount, avgPrice, recentEarnings } = useMemo(() => {
    const lotIds = new Set(lots.map((l) => l._id));
    const myAuctions = auctions.filter((a) => a.lot && lotIds.has(a.lot._id));

    const sold = myAuctions.filter((a) => a.status === 'closed' && a.finalAmount > 0);
    const totalEarned = sold.reduce((sum, a) => sum + (a.finalAmount || 0), 0);
    const avgPrice = sold.length > 0
      ? Math.round(sold.reduce((s, a) => s + (a.currentBidPerKg || 0), 0) / sold.length)
      : 0;

    // earnings over the last 30 days, bucketed by day
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const buckets = {};
    for (const a of sold) {
      if (!a.settledAt) continue;
      const t = new Date(a.settledAt).getTime();
      if (t < thirtyDaysAgo) continue;
      const day = new Date(a.settledAt).toISOString().slice(0, 10);  // YYYY-MM-DD
      buckets[day] = (buckets[day] || 0) + (a.finalAmount || 0);
    }
    const recentEarnings = Object.entries(buckets)
      .map(([date, value]) => ({ date, value }))
      .sort((x, y) => x.date.localeCompare(y.date));

    return {
      totalEarned,
      soldCount: sold.length,
      listedCount: lots.filter((l) => l.status === 'listed').length,
      liveCount: lots.filter((l) => l.status === 'in_auction').length,
      avgPrice,
      recentEarnings,
    };
  }, [lots, auctions]);

  // group lots
  const lotsByStatus = useMemo(() => {
    const live = lots.filter((l) => l.status === 'in_auction');
    const listed = lots.filter((l) => l.status === 'listed');
    const sold = lots.filter((l) => l.status === 'sold');
    const other = lots.filter((l) => !['in_auction', 'listed', 'sold'].includes(l.status));
    return { live, listed, sold, other };
  }, [lots]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Tractor size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Farmer Dashboard</h1>
          <p className="text-sm text-slate-500">Your lots, auctions, and earnings</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="ml-auto btn-primary text-sm"
        >
          {showCreate ? <ChevronUp size={14} /> : <Plus size={14} />}
          {showCreate ? 'Hide' : 'New Lot'}
        </button>
      </div>

      {/* stats row */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <BigStat icon={IndianRupee} label="Total Earned" value={`₹${totalEarned.toLocaleString('en-IN')}`} tone="green" />
        <BigStat icon={ShoppingBag} label="Lots Sold"    value={soldCount} tone="emerald" />
        <BigStat icon={Activity}    label="Live Now"     value={liveCount} tone={liveCount > 0 ? 'emerald' : 'slate'} />
        <BigStat icon={Package}     label="Listed"       value={listedCount} tone="blue" />
        <BigStat icon={TrendingUp}  label="Avg ₹/kg"     value={avgPrice > 0 ? `₹${avgPrice}` : '—'} tone="amber" />
      </section>

      {/* earnings chart */}
      {recentEarnings.length > 0 && (
        <section className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-600" />
            <h2 className="text-sm font-semibold">Earnings (last 30 days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={recentEarnings} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Earnings']}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* collapsible create form */}
      {showCreate && (
        <CreateLotForm
          onCreated={() => { setShowCreate(false); refresh(); }}
        />
      )}

      {/* lots grouped by status */}
      {loading ? (
        <div className="card p-8 text-center text-slate-400">Loading…</div>
      ) : lots.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No lots yet.{' '}
          <button onClick={() => setShowCreate(true)} className="text-emerald-600 font-medium hover:underline">
            Create your first one.
          </button>
        </div>
      ) : (
        <>
          {lotsByStatus.live.length > 0 && (
            <LotSection title="Live Auctions" lots={lotsByStatus.live} onChanged={refresh} dotColor="bg-emerald-500" />
          )}
          {lotsByStatus.listed.length > 0 && (
            <LotSection title="Listed (Ready to Auction)" lots={lotsByStatus.listed} onChanged={refresh} dotColor="bg-blue-500" />
          )}
          {lotsByStatus.sold.length > 0 && (
            <LotSection title="Sold" lots={lotsByStatus.sold} onChanged={refresh} dotColor="bg-slate-400" />
          )}
          {lotsByStatus.other.length > 0 && (
            <LotSection title="Other" lots={lotsByStatus.other} onChanged={refresh} dotColor="bg-slate-300" />
          )}
        </>
      )}
    </div>
  );
}

function BigStat({ icon: Icon, label, value, tone }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    green:   'bg-green-50 text-green-700',
    blue:    'bg-blue-50 text-blue-700',
    amber:   'bg-amber-50 text-amber-700',
    slate:   'bg-slate-50 text-slate-500',
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

function LotSection({ title, lots, onChanged, dotColor }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-xs text-slate-500">({lots.length})</span>
      </div>
      <div className="space-y-2">
        {lots.map((l) => <LotRow key={l._id} lot={l} onChanged={onChanged} />)}
      </div>
    </section>
  );
}

function CreateLotForm({ onCreated }) {
  const [form, setForm] = useState({
    variety: 'Bette', grade: 'A', weightKg: '', basePricePerKg: '',
    region: '', moisturePct: '', description: '',
  });
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await lotApi.createLot({
        ...form,
        weightKg: Number(form.weightKg),
        basePricePerKg: Number(form.basePricePerKg),
        moisturePct: form.moisturePct === '' ? undefined : Number(form.moisturePct),
      });
      toast.success('Lot created');
      onCreated();
    } catch (e) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Plus size={18} /> Create New Lot
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <Wrap icon={Tag} label="Variety">
          <select className="input" value={form.variety} onChange={set('variety')}>
            {['Bette', 'Rashi', 'Sippe', 'Other'].map((v) => <option key={v}>{v}</option>)}
          </select>
        </Wrap>
        <Wrap icon={Tag} label="Grade">
          <select className="input" value={form.grade} onChange={set('grade')}>
            {['A','B','C'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </Wrap>
        <Wrap icon={Scale} label="Weight (kg)">
          <input className="input" type="number" step="0.1" placeholder="e.g. 100" value={form.weightKg} onChange={set('weightKg')} required />
        </Wrap>
        <Wrap icon={Tag} label="Base Price ₹/kg">
          <input className="input" type="number" step="0.01" placeholder="e.g. 450" value={form.basePricePerKg} onChange={set('basePricePerKg')} required />
        </Wrap>
        <Wrap icon={MapPin} label="Region">
          <input className="input" placeholder="e.g. Shivamogga" value={form.region} onChange={set('region')} required />
        </Wrap>
        <Wrap icon={Droplets} label="Moisture % (optional)">
          <input className="input" type="number" step="0.1" placeholder="e.g. 12" value={form.moisturePct} onChange={set('moisturePct')} />
        </Wrap>
      </div>
      <textarea
        className="input mt-3" placeholder="Description (optional)"
        value={form.description} onChange={set('description')} rows={2}
      />
      <button disabled={busy} className="btn-primary mt-4">
        <Plus size={16} /> {busy ? 'Creating…' : 'Create Lot'}
      </button>
    </form>
  );
}

function Wrap({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
        <Icon size={12} /> {label}
      </label>
      {children}
    </div>
  );
}

function LotRow({ lot, onChanged }) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [auction, setAuction] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (lot.status === 'sold') {
      auctionApi.listAuctions().then((data) => {
        if (cancelled) return;
        const match = data.items.find((a) => a.lot?._id === lot._id);
        setAuction(match || null);
      }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [lot._id, lot.status]);

  const statusLabel = {
    listed: 'Listed',
    in_auction: 'Live',
    sold: 'Sold',
    cancelled: 'Cancelled',
    draft: 'Draft',
  }[lot.status] || lot.status;

  async function delLot() {
    if (!confirm('Delete this lot?')) return;
    try {
      await lotApi.deleteLot(lot._id);
      toast.success('Lot deleted');
      onChanged();
    } catch (e) { toast.error(e.message); }
  }

  async function dl() {
    if (!auction?._id) return;
    try {
      await auctionApi.downloadInvoice(auction._id);
      toast.success('Invoice downloaded');
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{lot.variety}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono">Grade {lot.grade}</span>
            <span className={`badge-${lot.status === 'in_auction' ? 'live' : 'closed'}`}>
              {lot.status === 'in_auction' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />}
              {statusLabel}
            </span>
          </div>
          <div className="text-sm text-slate-500 mt-1">
            {lot.weightKg}kg · ₹{lot.basePricePerKg}/kg · {lot.region}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {lot.status === 'listed' && (
            <button
              onClick={() => setShowSchedule((v) => !v)}
              className={showSchedule ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
            >
              <Calendar size={14} />
              {showSchedule ? 'Cancel' : 'Schedule'}
            </button>
          )}
          {(lot.status === 'listed' || lot.status === 'draft' || lot.status === 'in_auction') && (
            <button
              onClick={() => setShowImages((v) => !v)}
              className={showImages ? 'btn-secondary text-sm' : 'btn-secondary text-sm'}
              title="Manage images"
            >
              <ImageIcon size={14} />
              {showImages ? 'Hide' : 'Images'}
              {lot.images?.length > 0 && <span className="ml-1 text-xs text-slate-500">({lot.images.length})</span>}
            </button>
          )}
          {lot.status === 'sold' && auction && (
            <button onClick={dl} className="btn-primary text-sm">
              <FileDown size={14} /> Invoice
            </button>
          )}
          {(lot.status === 'listed' || lot.status === 'draft') && (
            <button onClick={delLot} className="btn-secondary text-sm" title="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {showSchedule && lot.status === 'listed' && (
        <ScheduleAuction lotId={lot._id} onScheduled={() => { setShowSchedule(false); onChanged(); }} />
      )}

      {showImages && (
        <LotImageManager lotId={lot._id} images={lot.images || []} onChanged={onChanged} />
      )}
    </div>
  );
}

function ScheduleAuction({ lotId, onScheduled }) {
  const [startMins, setStartMins] = useState(1);
  const [durationMins, setDurationMins] = useState(10);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const startAt = new Date(Date.now() + startMins * 60_000).toISOString();
      const endAt   = new Date(Date.now() + (startMins + durationMins) * 60_000).toISOString();
      await auctionApi.createAuction({ lotId, startAt, endAt });
      toast.success(`Auction scheduled · starts in ${startMins} min`);
      onScheduled();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-end gap-3 text-sm">
      <Wrap icon={Calendar} label="Starts in (mins)">
        <input type="number" min="0" value={startMins} onChange={(e) => setStartMins(Number(e.target.value))} className="input w-32" />
      </Wrap>
      <Wrap icon={Calendar} label="Duration (mins)">
        <input type="number" min="1" value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))} className="input w-32" />
      </Wrap>
      <button onClick={go} disabled={busy} className="btn-primary">
        <Calendar size={14} />
        {busy ? 'Scheduling…' : 'Schedule Auction'}
      </button>
    </div>
  );
}
