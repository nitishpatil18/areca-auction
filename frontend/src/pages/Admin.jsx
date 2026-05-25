import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, TrendingUp, IndianRupee, Activity, Users as UsersIcon, Package, KeyRound, Copy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import * as adminApi from '../api/admin.js';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [failed, setFailed] = useState([]);
  const [pendingResets, setPendingResets] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.listUsers(),
      adminApi.listAuctions(),
      adminApi.listFailedSettlements(),
      adminApi.listPendingPasswordResets(),
    ])
      .then(([s, u, a, f, p]) => {
        setStats(s);
        setUsers(u.items);
        setAuctions(a.items);
        setFailed(f.items);
        setPendingResets(p.items);
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
          <p className="text-sm text-slate-500">Platform health, users, and auctions</p>
        </div>
        <button
          onClick={refresh}
          className="ml-auto text-xs px-3 py-1.5 border border-slate-300 rounded hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {stats && (
        <>
          {/* primary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <BigStat icon={IndianRupee} label="Total Settled" value={`₹${(stats.totalSettledValue / 1000).toFixed(0)}k`} tone="green" />
            <BigStat icon={Activity}    label="Live Auctions" value={stats.liveAuctions} tone="blue" />
            <BigStat icon={Package}     label="Sold Lots"     value={stats.soldLots} tone="emerald" />
            <BigStat icon={AlertTriangle} label="Failed Settlements" value={stats.failedSettlements} tone={stats.failedSettlements > 0 ? 'red' : 'slate'} />
          </div>

          {/* secondary stat cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <Stat label="Users"      value={stats.users} />
            <Stat label="Farmers"    value={stats.usersByRole.farmer || 0} />
            <Stat label="Buyers"     value={stats.usersByRole.buyer  || 0} />
            <Stat label="Total Lots" value={stats.lots} />
            <Stat label="Scheduled"  value={stats.scheduledAuctions} />
            <Stat label="Total Bids" value={stats.bids} />
          </div>

          {/* auctions per day chart */}
          {stats.auctionsByDay.length > 0 && (
            <section className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-slate-500" />
                <h2 className="text-sm font-semibold">Auctions Created (last 14 days)</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.auctionsByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* failed settlements */}
          {failed.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} className="text-red-600" />
                <h2 className="text-lg font-semibold">Failed Settlements</h2>
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">{failed.length}</span>
              </div>
              <div className="overflow-x-auto card">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="px-3 py-2">Lot</th>
                      <th className="px-3 py-2">Farmer</th>
                      <th className="px-3 py-2">Winner</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failed.map((a) => (
                      <tr key={a._id} className="border-t border-slate-100">
                        <td className="px-3 py-2">{a.lot?.variety} · {a.lot?.grade} · {a.lot?.weightKg}kg</td>
                        <td className="px-3 py-2">{a.farmer?.name}</td>
                        <td className="px-3 py-2">{a.highestBidder?.name || '—'}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            {a.settlementFailureReason}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{new Date(a.updatedAt).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* pending password resets */}
      {pendingResets.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={18} className="text-amber-600" />
            <h2 className="text-lg font-semibold">Pending Password Resets</h2>
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{pendingResets.length}</span>
            <span className="text-xs text-slate-500 ml-2">(demo: no email sent — share token with user)</span>
          </div>
          <div className="overflow-x-auto card">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Token</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {pendingResets.map((r) => (
                  <tr key={r._id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-xs" title={r.passwordResetToken}>
                      {r.passwordResetToken.slice(0, 16)}…
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {new Date(r.passwordResetExpires).toLocaleTimeString('en-IN')}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(r.passwordResetToken);
                          toast.success('Token copied');
                        }}
                        className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded inline-flex items-center gap-1"
                      >
                        <Copy size={12} /> Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* users */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <UsersIcon size={18} className="text-slate-500" />
          <h2 className="text-lg font-semibold">Users</h2>
          <span className="text-xs text-slate-500">({users.length})</span>
        </div>
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
                  <td className="px-3 py-2">₹{u.walletBalance?.toLocaleString('en-IN') || 0}</td>
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

      {/* auctions */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={18} className="text-slate-500" />
          <h2 className="text-lg font-semibold">All Auctions</h2>
          <span className="text-xs text-slate-500">({auctions.length})</span>
        </div>
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
                  <td className="px-3 py-2">{a.lot?.variety} · {a.lot?.grade} · {a.lot?.weightKg}kg</td>
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

function BigStat({ icon: Icon, label, value, tone }) {
  const tones = {
    green:   'bg-green-50 text-green-700',
    blue:    'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50 text-red-700',
    slate:   'bg-slate-50 text-slate-700',
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-xs text-slate-500 uppercase">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}
