import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import * as analyticsApi from '../api/analytics.js';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c'];

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState({});
  const [regions, setRegions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      analyticsApi.getSummary(),
      analyticsApi.getTrends(),
      analyticsApi.getRegions(),
      analyticsApi.getActivity(),
    ])
      .then(([s, t, r, a]) => {
        setSummary(s);
        setTrends(t.series);
        setRegions(r.regions);
        setActivity(a.activity);
      })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">analytics</h1>
      {err && <div className="text-red-600">{err}</div>}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="total lots"          value={summary.totalLots} />
          <Stat label="total auctions"      value={summary.totalAuctions} />
          <Stat label="closed auctions"     value={summary.closedAuctions} />
          <Stat label="total bids"          value={summary.totalBids} />
          <Stat label="avg final ₹/kg"      value={`₹${summary.avgClosedPricePerKg}`} />
          <Stat label="total settled value" value={`₹${summary.totalSettledAmount.toLocaleString()}`} />
        </div>
      )}

      <section className="border border-slate-200 rounded bg-white p-5">
        <h2 className="text-lg font-semibold mb-4">price trends by variety (last 90 days)</h2>
        <PriceTrendsChart trends={trends} />
      </section>

      <section className="border border-slate-200 rounded bg-white p-5">
        <h2 className="text-lg font-semibold mb-4">region comparison (closed auctions)</h2>
        <RegionChart regions={regions} />
      </section>

      <section className="border border-slate-200 rounded bg-white p-5">
        <h2 className="text-lg font-semibold mb-4">bid activity (last 30 days)</h2>
        <ActivityChart activity={activity} />
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-slate-200 rounded bg-white p-4">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function PriceTrendsChart({ trends }) {
  const varieties = Object.keys(trends);
  if (varieties.length === 0) {
    return <Empty msg="no closed auctions yet. close an auction to see price trends." />;
  }

  // merge into a single array indexed by day
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
  if (regions.length === 0) return <Empty msg="no region data yet." />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={regions}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="region" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit=" ₹/kg" width={80} />
        <Tooltip />
        <Legend />
        <Bar dataKey="avgPrice" name="avg price ₹/kg" fill="#2563eb" />
        <Bar dataKey="maxPrice" name="max price ₹/kg" fill="#16a34a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActivityChart({ activity }) {
  if (activity.length === 0) return <Empty msg="no recent bid activity." />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={activity}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={50} />
        <Tooltip />
        <Legend />
        <Bar dataKey="bids" name="bids placed" fill="#9333ea" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty({ msg }) {
  return <div className="text-slate-500 text-sm py-8 text-center">{msg}</div>;
}