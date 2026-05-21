import { useEffect, useState } from 'react';
import {
  Wallet as WalletIcon, Plus, Coins, Lock, TrendingUp,
  ArrowDownCircle, ArrowUpCircle, Receipt, ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../hooks/useWallet.js';

export default function Wallet() {
  const wallet = useWallet();
  const [topUpAmount, setTopUpAmount] = useState('');

  useEffect(() => {
    wallet.fetchStatus().catch((e) => toast.error(e.message));
    wallet.fetchTransactions({ page: 1, limit: 20 }).catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doTopUp(e) {
    e.preventDefault();
    try {
      const r = await wallet.topUp(Number(topUpAmount));
      toast.success(`Added ₹${topUpAmount} · Balance ₹${r.balance.toLocaleString()}`);
      setTopUpAmount('');
      wallet.fetchTransactions({ page: 1, limit: 20 });
    } catch (e) { toast.error(e.message); }
  }

  function goToPage(page) {
    if (page < 1 || page > wallet.txTotalPages) return;
    wallet.fetchTransactions({ page, limit: 20 }).catch((e) => toast.error(e.message));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <WalletIcon size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Wallet</h1>
          <p className="text-sm text-slate-500">Manage funds, view your complete transaction history</p>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <Stat label="Balance"   value={wallet.balance}   icon={Coins}      color="bg-emerald-100 text-emerald-700" />
        <Stat label="Held"      value={wallet.held}      icon={Lock}       color="bg-amber-100 text-amber-700" />
        <Stat label="Available" value={wallet.available} icon={TrendingUp} color="bg-blue-100 text-blue-700" />
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <WalletIcon size={18} /> Add Funds
        </h2>
        <form onSubmit={doTopUp} className="flex gap-2">
          <input
            type="number" min="1"
            placeholder="Amount in ₹ (mock payment)"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            className="input flex-1"
            required
          />
          <button className="btn-primary"><Plus size={16} /> Top Up</button>
        </form>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Receipt size={18} /> Transaction History
          </h2>
          <span className="text-sm text-slate-500">{wallet.txTotal} total</span>
        </div>

        {wallet.txStatus === 'loading' && wallet.transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">Loading transactions...</div>
        ) : wallet.transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            No transactions yet. Top up your wallet to get started.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Amount</th>
                    <th className="py-3 pr-4 font-medium">Reference</th>
                    <th className="py-3 pr-4 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.transactions.map((t) => <TransactionRow key={t._id} t={t} />)}
                </tbody>
              </table>
            </div>

            {wallet.txTotalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  Page {wallet.txPage} of {wallet.txTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(wallet.txPage - 1)}
                    disabled={wallet.txPage <= 1}
                    className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <button
                    onClick={() => goToPage(wallet.txPage + 1)}
                    disabled={wallet.txPage >= wallet.txTotalPages}
                    className="btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 uppercase font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-extrabold">
        ₹{value != null ? value.toLocaleString() : '—'}
      </div>
    </div>
  );
}

const TYPE_META = {
  credit_topup:       { label: 'Top Up',            icon: ArrowDownCircle, color: 'text-emerald-600',  signClass: 'text-emerald-600' },
  auction_settlement: { label: 'Auction Settlement', icon: ArrowUpCircle,   color: 'text-rose-600',     signClass: 'text-rose-600' },
  farmer_payout:      { label: 'Sale Payout',        icon: ArrowDownCircle, color: 'text-emerald-600',  signClass: 'text-emerald-600' },
};

function TransactionRow({ t }) {
  const meta = TYPE_META[t.type] || { label: t.type, icon: Receipt, color: 'text-slate-500', signClass: 'text-slate-700' };
  const Icon = meta.icon;
  const sign = t.amount >= 0 ? '+' : '';
  const date = new Date(t.createdAt);
  const dateLabel = date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition">
      <td className="py-3 pr-4">
        <div className={`flex items-center gap-2 ${meta.color}`}>
          <Icon size={16} />
          <span className="font-medium text-slate-700">{meta.label}</span>
        </div>
      </td>
      <td className={`py-3 pr-4 font-semibold ${meta.signClass}`}>
        {sign}₹{Math.abs(t.amount).toLocaleString()}
      </td>
      <td className="py-3 pr-4 text-slate-500">
        {t.auction ? `Auction · ₹${(t.auction.finalAmount || t.auction.currentBidPerKg || 0).toLocaleString()}` : '—'}
      </td>
      <td className="py-3 pr-4 text-right text-slate-500 whitespace-nowrap">
        {dateLabel}
      </td>
    </tr>
  );
}
