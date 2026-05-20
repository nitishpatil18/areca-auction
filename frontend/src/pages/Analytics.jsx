import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as analyticsApi from '../api/analytics.js';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c'];

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState({});
  const [regions, setRegions] = useState([]);
  const [activity, setActivity] = useState([]);

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
      .catch((e) => toast.error(e.message));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
          <BarChart3 size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-slate-500">Market trends, regional comparison, and bid activity</p>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Total Lots"        value={summary.totalLots} />
          <Stat label="Total Auctions"    value={summary.totalAuctions} />
          <Stat label="Closed Auctions"   value={summary.closedAuctions} />
          <Stat label="Total Bids"        value={summary.totalBids} />
          <Stat label="Avg Final ₹/kg"    value={`₹${summary.avgClosedPricePerKg}`} />
          <Stat label="Settled Value"     value={`₹${summary.totalSettledAmount.toLocaleString()}`} />
        </div>
      )}

      <section className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Price Trends by Variety (Last 90 Days)</h2>
        <PriceTrendsChart trends={trends} />
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Regional Comparison (Closed Auctions)</h2>
        <RegionChart regions={regions} />
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Bid Activity (Last 30 Days)</h2>
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

function PriceTrendsChart({ trends }) {
  const varieties = Object.keys(trends);
  if (varieties.length === 0) {
    return <Empty msg="No closed auctions yet. Close an auction to see price trends." />;
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
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={regions}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="region" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} unit=" ₹/kg" width={80} />
        <Tooltip />
        <Legend />
        <Bar dataKey="avgPrice" name="Avg Price ₹/kg" fill="#2563eb" />
        <Bar dataKey="maxPrice" name="Max Price ₹/kg" fill="#16a34a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActivityChart({ activity }) {
  if (activity.length === 0) return <Empty msg="No recent bid activity." />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={activity}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={50} />
        <Tooltip />
        <Legend />
        <Bar dataKey="bids" name="Bids Placed" fill="#9333ea" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty({ msg }) {
  return <div className="text-slate-500 text-sm py-8 text-center">{msg}</div>;
}