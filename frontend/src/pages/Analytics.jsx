import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, TrendingUp, Sparkles, MapPin, Activity, PieChart as PieIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import * as analyticsApi from '../api/analytics.js';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c'];
const STATUS_COLORS = {
  live:      '#10b981',
  scheduled: '#3b82f6',
  closed:    '#64748b',
  cancelled: '#ef4444',
};

const RANGES = [
  { label: '7 days',  trends: 7,  activity: 7 },
  { label: '30 days', trends: 30, activity: 30 },
  { label: '90 days', trends: 90, activity: 90 },
];

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState({});
  const [regions, setRegions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [statusMix, setStatusMix] = useState([]);
  const [insights, setInsights] = useState([]);
  const [rangeIdx, setRangeIdx] = useState(1);  // default 30 days

  const range = RANGES[rangeIdx];

  // initial fetch (everything except trends + activity)
  useEffect(() => {
    Promise.all([
      analyticsApi.getSummary(),
      analyticsApi.getRegions(),
      analyticsApi.getStatusMix(),
      analyticsApi.getInsights(),
    ])
      .then(([s, r, sm, ins]) => {
        setSummary(s);
        setRegions(r.regions);
        setStatusMix(sm.mix);
        setInsights(ins.items);
      })
      .catch((e) => toast.error(e.message));
  }, []);

  // refetch trends + activity when range changes
  useEffect(() => {
    Promise.all([
      analyticsApi.getTrends(range.trends),
      analyticsApi.getActivity(range.activity),
    ])
      .then(([t, a]) => {
        setTrends(t.series);
        setActivity(a.activity);
      })
      .catch((e) => toast.error(e.message));
  }, [rangeIdx, range.trends, range.activity]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
          <BarChart3 size={20} />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-slate-500">Market trends, regional comparison, and bid activity</p>
        </div>
        <div className="flex gap-1 text-sm bg-slate-100 rounded-lg p-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 rounded transition ${
                i === rangeIdx
                  ? 'bg-white text-slate-900 shadow-sm font-medium'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* summary stat cards */}
      {summary && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Total Lots"        value={summary.totalLots} />
          <Stat label="Total Auctions"    value={summary.totalAuctions} />
          <Stat label="Closed Auctions"   value={summary.closedAuctions} />
          <Stat label="Total Bids"        value={summary.totalBids} />
          <Stat label="Avg Final ₹/kg"    value={`₹${summary.avgClosedPricePerKg}`} />
          <Stat label="Settled Value"     value={`₹${(summary.totalSettledAmount / 1000).toFixed(0)}k`} />
        </section>
      )}

      {/* insights callouts */}
      {insights.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold">Key Insights</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
          </div>
        </section>
      )}

      {/* price trends */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={18} />
          Price Trends by Variety
          <span className="ml-auto text-xs text-slate-500">{range.label}</span>
        </h2>
        <PriceTrendsChart trends={trends} />
      </section>

      {/* two-column: region comparison + status mix donut */}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="card p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <MapPin size={16} />
            Regional Comparison
          </h2>
          <RegionChart regions={regions} />
        </section>
        <section className="card p-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <PieIcon size={16} />
            Auction Status Mix
          </h2>
          <StatusMixChart mix={statusMix} />
        </section>
      </div>

      {/* bid activity */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity size={18} />
          Bid Activity
          <span className="ml-auto text-xs text-slate-500">{range.label}</span>
        </h2>
        <ActivityChart activity={activity} />
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function InsightCard({ insight }) {
  const tones = {
    green:  'bg-emerald-50 border-emerald-200 text-emerald-900',
    blue:   'bg-blue-50 border-blue-200 text-blue-900',
    amber:  'bg-amber-50 border-amber-200 text-amber-900',
    red:    'bg-red-50 border-red-200 text-red-900',
  };
  return (
    <div className={`border rounded-lg p-4 ${tones[insight.tone] || tones.blue}`}>
      <div className="text-xs font-semibold uppercase mb-1 opacity-70">{insight.title}</div>
      <div className="text-sm font-medium leading-snug">{insight.text}</div>
    </div>
  );
}

function PriceTrendsChart({ trends }) {
  const varieties = Object.keys(trends);
  if (varieties.length === 0) {
    return <Empty msg="No closed auctions in this time range." />;
  }

  const dayMap = {};
  for (const v of varieties) {
    for (const point of trends[v]) {
      if (!dayMap[point.day]) dayMap[point.day] = { day: point.day };
      dayMap[point.day][v] = point.avgPrice;
    }
  }
  const merged = Object.values(dayMap).sort((a, b) => a.day.localeCompare(b.day));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={merged}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit=" ₹/kg" width={80} />
        <Tooltip />
        <Legend />
        {varieties.map((v, i) => (
          <Line key={v} type="monotone" dataKey={v} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function RegionChart({ regions }) {
  if (regions.length === 0) return <Empty msg="No region data yet." />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={regions} layout="vertical" margin={{ left: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 11 }} unit=" ₹" />
        <YAxis dataKey="region" type="category" tick={{ fontSize: 11 }} width={80} />
        <Tooltip />
        <Bar dataKey="avgPrice" name="Avg ₹/kg" fill="#2563eb" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function StatusMixChart({ mix }) {
  if (!mix || mix.length === 0) return <Empty msg="No auctions yet." />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={mix}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={50}
          paddingAngle={2}
          label={({ status, count }) => `${status}: ${count}`}
          labelLine={false}
        >
          {mix.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#64748b'} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ActivityChart({ activity }) {
  if (activity.length === 0) return <Empty msg="No recent bid activity." />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={activity}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={50} />
        <Tooltip />
        <Bar dataKey="bids" name="Bids Placed" fill="#9333ea" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty({ msg }) {
  return <div className="text-slate-500 text-sm py-8 text-center">{msg}</div>;
}
