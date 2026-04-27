import { useEffect, useState } from 'react';
import {
  Plus, Trash2, Calendar, Tractor, Package, Tag, Scale, MapPin, Droplets, FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as lotApi from '../api/lot.js';
import * as auctionApi from '../api/auction.js';

export default function FarmerDashboard() {
  const [lots, setLots] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    lotApi.myLots()
      .then((d) => setLots(d.items))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Tractor size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">farmer dashboard</h1>
          <p className="text-sm text-slate-500">list lots, schedule auctions, track sales</p>
        </div>
      </div>

      <CreateLotForm onCreated={refresh} />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package size={18} /> my lots
          </h2>
          <span className="text-sm text-slate-500">{lots.length} total</span>
        </div>
        {loading ? (
          <div className="card p-8 text-center text-slate-400">loading…</div>
        ) : lots.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            no lots yet. create your first one above.
          </div>
        ) : (
          <div className="space-y-2">
            {lots.map((l) => <LotRow key={l._id} lot={l} onChanged={refresh} />)}
          </div>
        )}
      </div>
    </div>
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
      toast.success('lot created');
      setForm({ variety: 'Bette', grade: 'A', weightKg: '', basePricePerKg: '', region: '', moisturePct: '', description: '' });
      onCreated();
    } catch (e) {
      toast.error(e.message);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Plus size={18} /> create new lot
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <Wrap icon={Tag} label="variety">
          <select className="input" value={form.variety} onChange={set('variety')}>
            {['Bette', 'Rashi', 'Sippe', 'Other'].map((v) => <option key={v}>{v}</option>)}
          </select>
        </Wrap>
        <Wrap icon={Tag} label="grade">
          <select className="input" value={form.grade} onChange={set('grade')}>
            {['A','B','C'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </Wrap>
        <Wrap icon={Scale} label="weight (kg)">
          <input className="input" type="number" step="0.1" placeholder="e.g. 100" value={form.weightKg} onChange={set('weightKg')} required />
        </Wrap>
        <Wrap icon={Tag} label="base price ₹/kg">
          <input className="input" type="number" step="0.01" placeholder="e.g. 450" value={form.basePricePerKg} onChange={set('basePricePerKg')} required />
        </Wrap>
        <Wrap icon={MapPin} label="region">
          <input className="input" placeholder="e.g. Shivamogga" value={form.region} onChange={set('region')} required />
        </Wrap>
        <Wrap icon={Droplets} label="moisture % (optional)">
          <input className="input" type="number" step="0.1" placeholder="e.g. 12" value={form.moisturePct} onChange={set('moisturePct')} />
        </Wrap>
      </div>
      <textarea
        className="input mt-3" placeholder="description (optional)"
        value={form.description} onChange={set('description')} rows={2}
      />
      <button disabled={busy} className="btn-primary mt-4">
        <Plus size={16} /> {busy ? 'creating…' : 'create lot'}
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
  const [auction, setAuction] = useState(null);

  // when status is 'sold', look up the matching auction so we have its id for the invoice
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

  async function delLot() {
    if (!confirm('delete this lot?')) return;
    try {
      await lotApi.deleteLot(lot._id);
      toast.success('lot deleted');
      onChanged();
    } catch (e) { toast.error(e.message); }
  }

  async function dl() {
    if (!auction?._id) return;
    try {
      await auctionApi.downloadInvoice(auction._id);
      toast.success('invoice downloaded');
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
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono">grade {lot.grade}</span>
            <span className={`badge-${lot.status === 'in_auction' ? 'live' : 'closed'}`}>
              {lot.status === 'in_auction' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />}
              {lot.status.replace('_', ' ')}
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
              {showSchedule ? 'cancel' : 'schedule'}
            </button>
          )}
          {lot.status === 'sold' && auction && (
            <button onClick={dl} className="btn-primary text-sm">
              <FileDown size={14} /> invoice
            </button>
          )}
          {(lot.status === 'listed' || lot.status === 'draft') && (
            <button onClick={delLot} className="btn-secondary text-sm" title="delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {showSchedule && lot.status === 'listed' && (
        <ScheduleAuction lotId={lot._id} onScheduled={() => { setShowSchedule(false); onChanged(); }} />
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
      toast.success(`auction scheduled · starts in ${startMins} min`);
      onScheduled();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-end gap-3 text-sm">
      <Wrap icon={Calendar} label="starts in (mins)">
        <input type="number" min="0" value={startMins} onChange={(e) => setStartMins(Number(e.target.value))} className="input w-32" />
      </Wrap>
      <Wrap icon={Calendar} label="duration (mins)">
        <input type="number" min="1" value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))} className="input w-32" />
      </Wrap>
      <button onClick={go} disabled={busy} className="btn-primary">
        <Calendar size={14} />
        {busy ? 'scheduling…' : 'schedule auction'}
      </button>
    </div>
  );
}