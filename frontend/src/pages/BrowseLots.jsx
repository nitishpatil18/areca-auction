import { useEffect, useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import * as lotApi from '../api/lot.js';
import LotCard from '../components/LotCard.jsx';

const VARIETIES = ['', 'Bette', 'Rashi', 'Sippe', 'Other'];
const GRADES = ['', 'A', 'B', 'C'];

export default function BrowseLots() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ variety: '', grade: '', region: '' });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    lotApi.listLots(params)
      .then((data) => { if (!cancelled) setItems(data.items); })
      .catch((e)   => { if (!cancelled) setErr(e.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Browse Lots</h1>
          <p className="text-slate-500 mt-1">{items.length} lot{items.length !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-700">
          <Filter size={14} />
          Filters
          {hasFilters && (
            <button
              onClick={() => setFilters({ variety: '', grade: '', region: '' })}
              className="ml-auto text-xs text-emerald-600 hover:underline flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <select
            className="input"
            value={filters.variety}
            onChange={(e) => setFilters((f) => ({ ...f, variety: e.target.value }))}
          >
            {VARIETIES.map((v) => <option key={v} value={v}>{v || 'All Varieties'}</option>)}
          </select>
          <select
            className="input"
            value={filters.grade}
            onChange={(e) => setFilters((f) => ({ ...f, grade: e.target.value }))}
          >
            {GRADES.map((g) => <option key={g} value={g}>{g ? `Grade ${g}` : 'All Grades'}</option>)}
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Region (e.g. Shivamogga)"
              value={filters.region}
              onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {err && <div className="card p-4 text-red-600 mb-4">{err}</div>}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">
          No lots match these filters.
          {hasFilters && (
            <button
              onClick={() => setFilters({ variety: '', grade: '', region: '' })}
              className="block mx-auto mt-3 text-emerald-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((lot) => <LotCard key={lot._id} lot={lot} />)}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-5 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/3 mb-4" />
      <div className="border-t border-slate-100 pt-3 space-y-2">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
        <div className="h-3 bg-slate-100 rounded w-3/4" />
      </div>
    </div>
  );
}