import { useEffect, useState } from 'react';
import * as adminApi from '../api/admin.js';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [err, setErr] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.listUsers(),
      adminApi.listAuctions(),
    ])
      .then(([s, u, a]) => {
        setStats(s);
        setUsers(u.items);
        setAuctions(a.items);
      })
      .catch((e) => setErr(e.message));
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  async function changeRole(userId, role) {
    try {
      await adminApi.setUserRole(userId, role);
      refresh();
    } catch (e) { alert(e.message); }
  }

  async function forceClose(auctionId) {
    if (!confirm('force close this auction?')) return;
    try {
      await adminApi.forceCloseAuction(auctionId);
      refresh();
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">admin panel</h1>
      {err && <div className="text-red-600">{err}</div>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="users"      value={stats.users} />
          <Stat label="farmers"    value={stats.usersByRole.farmer || 0} />
          <Stat label="buyers"     value={stats.usersByRole.buyer  || 0} />
          <Stat label="lots"       value={stats.lots} />
          <Stat label="live"       value={stats.liveAuctions} />
          <Stat label="scheduled"  value={stats.scheduledAuctions} />
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">users</h2>
        <div className="overflow-x-auto border border-slate-200 rounded bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">name</th>
                <th className="px-3 py-2">email</th>
                <th className="px-3 py-2">role</th>
                <th className="px-3 py-2">balance</th>
                <th className="px-3 py-2">region</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">₹{u.walletBalance}</td>
                  <td className="px-3 py-2">{u.region || '—'}</td>
                  <td className="px-3 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u._id, e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="buyer">buyer</option>
                      <option value="farmer">farmer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">auctions</h2>
        <div className="overflow-x-auto border border-slate-200 rounded bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">lot</th>
                <th className="px-3 py-2">farmer</th>
                <th className="px-3 py-2">status</th>
                <th className="px-3 py-2">current bid</th>
                <th className="px-3 py-2">leader</th>
                <th className="px-3 py-2">on chain</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {auctions.map((a) => (
                <tr key={a._id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    {a.lot?.variety} · {a.lot?.grade} · {a.lot?.weightKg}kg
                  </td>
                  <td className="px-3 py-2">{a.farmer?.name}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      a.status === 'live'   ? 'bg-green-100 text-green-700' :
                      a.status === 'closed' ? 'bg-slate-200 text-slate-600' :
                      'bg-blue-100 text-blue-700'
                    }`}>{a.status}</span>
                  </td>
                  <td className="px-3 py-2">₹{a.currentBidPerKg || a.basePricePerKg}/kg</td>
                  <td className="px-3 py-2">{a.highestBidder?.name || '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {a.onChainAuctionId ? `#${a.onChainAuctionId}` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {(a.status === 'live' || a.status === 'scheduled') && (
                      <button
                        onClick={() => forceClose(a._id)}
                        className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                      >
                        force close
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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