import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Zap, Shield, BarChart3, Wallet, ArrowRight, Sprout,
  Tractor, ShoppingBag, Sparkles, CheckCircle2, Network, Users, Package, IndianRupee,
} from 'lucide-react';
import * as publicApi from '../api/public.js';

export default function Home() {
  const { user } = useSelector((s) => s.auth);

  return (
    <div className="bg-gradient-to-b from-emerald-50/50 to-white">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-5">
              <Sparkles size={14} />
              Real-time Blockchain Auctions
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Fair Pricing for Arecanut, <span className="text-emerald-600">Live and On-Chain</span>.
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Farmers list their produce, buyers bid in real-time. Every bid is recorded on
              the Ethereum blockchain for tamper-proof history. Settlements happen instantly.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {user ? (
                <Link to={user.role === 'farmer' ? '/farmer' : user.role === 'buyer' ? '/buyer' : '/admin'} className="btn-primary">
                  Go to Dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary">
                    Get Started <ArrowRight size={16} />
                  </Link>
                  <Link to="/lots" className="btn-secondary">
                    Browse Lots
                  </Link>
                </>
              )}
            </div>

            <LiveStatsStrip />
          </div>

          <FeaturedAuctionCard />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Why Areca Auction?</h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Built ground-up for the arecanut trade. Fast where it needs to be. Trustless where it counts.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Feature
            icon={Zap}
            color="bg-amber-100 text-amber-700"
            title="Real-time Bidding"
            body="WebSocket-powered live updates. See every bid the moment it lands."
          />
          <Feature
            icon={Shield}
            color="bg-emerald-100 text-emerald-700"
            title="On-chain Records"
            body="Every auction is mirrored to Ethereum. Tamper-proof settlement history."
          />
          <Feature
            icon={Wallet}
            color="bg-blue-100 text-blue-700"
            title="Instant Settlement"
            body="Winners' wallets debit, farmers' credit. Atomic. No middleman."
          />
          <Feature
            icon={BarChart3}
            color="bg-purple-100 text-purple-700"
            title="Market Analytics"
            body="Track price trends by variety, grade, and region over time."
          />
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Step
            n={1}
            icon={Tractor}
            title="Farmer Lists a Lot"
            body="Upload variety, grade, weight, region, and base price. Schedule the auction window."
          />
          <Step
            n={2}
            icon={ShoppingBag}
            title="Buyers Bid Live"
            body="Multiple buyers compete in real-time. The highest valid bid wins when the timer ends."
          />
          <Step
            n={3}
            icon={CheckCircle2}
            title="Auto Settlement"
            body="Winning amount transfers off-chain instantly. On-chain receipt provides audit trail."
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="card p-10 text-center bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 text-white">
          <Sprout size={40} className="mx-auto mb-4 opacity-80" />
          <h3 className="text-2xl md:text-3xl font-bold mb-3">Ready to Trade?</h3>
          <p className="text-emerald-50 max-w-xl mx-auto mb-6">
            Join farmers and buyers using fair, transparent, real-time auctions.
          </p>
          {!user && (
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn bg-white text-emerald-700 hover:bg-emerald-50">
                Create an Account <ArrowRight size={16} />
              </Link>
              <Link to="/lots" className="btn bg-emerald-800 text-white hover:bg-emerald-900">
                Browse Lots
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Feature({ icon: Icon, color, title, body }) {
  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
        <Icon size={20} />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{body}</p>
    </div>
  );
}

function Step({ n, icon: Icon, title, body }) {
  return (
    <div className="card p-6 relative">
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
        {n}
      </div>
      <Icon size={24} className="text-emerald-600 mb-3" />
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-slate-600">{body}</p>
    </div>
  );
}
function FeaturedAuctionCard() {
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    function fetchIt() {
      publicApi.featuredAuction()
        .then((d) => { if (alive) { setAuction(d.auction); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
    }
    fetchIt();
    const id = setInterval(fetchIt, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (loading) {
    return (
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-200 to-emerald-100 rounded-3xl blur-2xl opacity-60" />
        <div className="relative card p-6 animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-24 mb-4" />
          <div className="h-3 bg-slate-100 rounded w-3/4 mb-3" />
          <div className="h-10 bg-slate-200 rounded w-1/2 mt-4" />
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="relative">
        <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-200 to-emerald-100 rounded-3xl blur-2xl opacity-60" />
        <div className="relative card p-6 text-center">
          <Sprout size={32} className="mx-auto text-emerald-600 mb-3" />
          <h3 className="font-semibold mb-1">No active auctions yet</h3>
          <p className="text-sm text-slate-500 mb-4">Be the first to list a lot or bid.</p>
          <Link to="/lots" className="btn-secondary inline-flex">Browse Lots</Link>
        </div>
      </div>
    );
  }

  const isLive = auction.status === 'live';
  const isClosed = auction.status === 'closed';
  const isScheduled = auction.status === 'scheduled';

  const statusLabel = isLive ? 'LIVE NOW' : isScheduled ? 'STARTING SOON' : 'RECENTLY CLOSED';
  const statusColor = isLive ? 'text-emerald-700 bg-emerald-50' : isClosed ? 'text-slate-600 bg-slate-100' : 'text-blue-700 bg-blue-50';
  const priceLabel = isClosed ? 'Final Price' : isScheduled ? 'Base Price' : 'Current Bid';
  const price = isClosed
    ? auction.currentBidPerKg || auction.basePricePerKg
    : isScheduled
      ? auction.basePricePerKg
      : auction.currentBidPerKg || auction.basePricePerKg;

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-200 to-emerald-100 rounded-3xl blur-2xl opacity-60" />
      <div className="relative card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
            {isLive && <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot" />}
            {statusLabel}
          </div>
          <span className="text-xs text-slate-500 font-mono">#{auction._id.slice(-6)}</span>
        </div>

        <div className="mb-3">
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            {auction.lot?.variety} · Grade {auction.lot?.grade} · {auction.lot?.weightKg}kg
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {auction.farmer?.name} · {auction.farmer?.region || auction.lot?.region}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3 mb-3">
          <div className="text-xs text-slate-500 uppercase">{priceLabel}</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">
            ₹{price?.toLocaleString('en-IN')}<span className="text-lg text-slate-500">/kg</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {auction.bidCount || 0} bid{auction.bidCount !== 1 ? 's' : ''}
            {auction.highestBidder && ` · Leader: ${auction.highestBidder.name}`}
          </div>
        </div>

        {auction.onChainAuctionId && (
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-600">
            <Network size={14} className="text-emerald-600" />
            On-chain ID #{auction.onChainAuctionId}
          </div>
        )}

        <Link
          to={`/lots/${auction.lot?._id}`}
          className="mt-4 btn-primary w-full justify-center text-sm"
        >
          View Auction <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function LiveStatsStrip() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    publicApi.publicStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) {
    return <div className="mt-10 h-12 bg-slate-100 rounded animate-pulse w-full max-w-md" />;
  }

  return (
    <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
      <BigStat
        icon={IndianRupee}
        value={stats.totalSettledValue >= 100000
          ? `${(stats.totalSettledValue / 100000).toFixed(1)}L`
          : `${(stats.totalSettledValue / 1000).toFixed(0)}k`}
        label="Volume Traded"
      />
      <BigStat icon={Package} value={stats.soldLots} label="Lots Sold" />
      <BigStat icon={Users}   value={stats.totalUsers} label="Active Users" />
    </div>
  );
}

function BigStat({ icon: Icon, value, label }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="text-emerald-600" />
        <span className="font-bold text-slate-900 text-lg">{value}</span>
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

