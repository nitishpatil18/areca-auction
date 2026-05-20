import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import * as adminApi from '../api/admin.js';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auctions, setAuctions] = useState([]);
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
      .catch((e) => toast.error(e.message));
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  async function changeRole(userId, role) {
    try {
      await adminApi.setUserRole(userId, role);
      toast.success('Role updated');
      refresh();
    } catch (e) { toast.error(e.message); }
  }

  async function forceClose(auctionId) {
    if (!confirm('Force close this auction?')) return;
    try {
      await adminApi.forceCloseAuction(auctionId);
      toast.success('Auction closed');
      refresh();
    } catch (e) { toast.error(e.message); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
          <Shield size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-slate-500">Manage users and auctions</p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Users"     value={stats.users} />
          <Stat label="Farmers"   value={stats.usersByRole.farmer || 0} />
          <Stat label="Buyers"    value={stats.usersByRole.buyer  || 0} />
          <Stat label="Lots"      value={stats.lots} />
          <Stat label="Live"      value={stats.liveAuctions} />
          <Stat label="Scheduled" value={stats.scheduledAuctions} />
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">Users</h2>
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Balance</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-3 py-2 capitalize">{u.role}</td>
                  <td className="px-3 py-2">₹{u.walletBalance}</td>
                  <td className="px-3 py-2">{u.region || '—'}</td>
                  <td className="px-3 py-2">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u._id, e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs"
                    >
                      <option value="buyer">Buyer</option>
                      <option value="farmer">Farmer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Auctions</h2>
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Lot</th>
                <th className="px-3 py-2">Farmer</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Current Bid</th>
                <th className="px-3 py-2">Leader</th>
                <th className="px-3 py-2">On-Chain</th>
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
                  <td className="px-3 py-2 capitalize">
                    <span className={`badge-${a.status}`}>{a.status}</span>
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
                        Force Close
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
    <div className="card p-4">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}