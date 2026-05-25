import { useEffect, useState } from 'react';
import { Search, Filter, X, ArrowUpDown } from 'lucide-react';
import * as lotApi from '../api/lot.js';
import LotCard from '../components/LotCard.jsx';

const VARIETIES = ['', 'Bette', 'Rashi', 'Sippe', 'Other'];
const GRADES = ['', 'A', 'B', 'C'];
const STATUSES = [
  { value: '', label: 'All' },
  { value: 'listed', label: 'Listed' },
  { value: 'in_auction', label: 'Live' },
];
const SORTS = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',    label: 'Oldest first' },
  { value: 'priceAsc',  label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
];

const DEFAULT_FILTERS = {
  variety: '', grade: '', region: '', status: '',
  minPrice: '', maxPrice: '', sort: 'newest',
};

export default function BrowseLots() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // strip empty strings before sending
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
    );
    lotApi.listLots(params)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total ?? data.items.length);
      })
      .catch((e) => { if (!cancelled) setErr(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filters]);

  const hasFilters = Object.entries(filters).some(
    ([k, v]) => v !== '' && k !== 'sort'
  );

  function setField(key) {
    return (e) => {
      const val = e?.target ? e.target.value : e;
      setFilters((f) => ({ ...f, [key]: val }));
    };
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Browse Lots</h1>
          <p className="text-slate-500 mt-1">
            {loading ? 'Loading…' : `${total} lot${total !== 1 ? 's' : ''} ${hasFilters ? 'match filters' : 'available'}`}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
          <ArrowUpDown size={14} />
          <select className="input py-1.5" value={filters.sort} onChange={setField('sort')}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-700">
          <Filter size={14} />
          Filters
          {hasFilters && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="ml-auto text-xs text-emerald-600 hover:underline flex items-center gap-1"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        {/* status pills */}
        <div className="flex gap-2 mb-3">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setField('status')(s.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filters.status === s.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <select className="input" value={filters.variety} onChange={setField('variety')}>
            {VARIETIES.map((v) => <option key={v} value={v}>{v || 'All Varieties'}</option>)}
          </select>
          <select className="input" value={filters.grade} onChange={setField('grade')}>
            {GRADES.map((g) => <option key={g} value={g}>{g ? `Grade ${g}` : 'All Grades'}</option>)}
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Region (e.g. Shivamogga)"
              value={filters.region}
              onChange={setField('region')}
            />
          </div>
        </div>

        {/* price range */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <input
            type="number"
            min="0"
            className="input"
            placeholder="Min ₹/kg"
            value={filters.minPrice}
            onChange={setField('minPrice')}
          />
          <input
            type="number"
            min="0"
            className="input"
            placeholder="Max ₹/kg"
            value={filters.maxPrice}
            onChange={setField('maxPrice')}
          />
        </div>

        {/* mobile sort */}
        <div className="md:hidden mt-3">
          <select className="input" value={filters.sort} onChange={setField('sort')}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
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
              onClick={() => setFilters(DEFAULT_FILTERS)}
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
