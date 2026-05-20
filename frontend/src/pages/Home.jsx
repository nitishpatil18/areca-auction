import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Zap, Shield, BarChart3, Wallet, ArrowRight, Sprout,
  Tractor, ShoppingBag, Sparkles, CheckCircle2, Network,
} from 'lucide-react';

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

            <div className="mt-10 flex items-center gap-6 text-sm text-slate-600">
              <Stat n="Real-time" label="bidding" />
              <Stat n="On-chain" label="receipts" />
              <Stat n="Atomic" label="settlements" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-200 to-emerald-100 rounded-3xl blur-2xl opacity-60" />
            <div className="relative card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full pulse-dot" />
                  <span className="text-sm font-semibold text-emerald-700">LIVE</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">02m 13s</span>
              </div>
              <div className="mb-3">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Bette · Grade A · 100kg</div>
                <div className="text-xs text-slate-500 mt-0.5">Shivamogga, Karnataka</div>
              </div>
              <div className="border-t border-slate-200 pt-3 mb-3">
                <div className="text-xs text-slate-500 uppercase">Current Bid</div>
                <div className="text-3xl font-bold text-slate-900 mt-1">₹485<span className="text-lg text-slate-500">/kg</span></div>
                <div className="text-xs text-slate-500 mt-1">12 bids · 8 active bidders</div>
              </div>
              <div className="space-y-1.5 text-xs">
                <Bid name="Satyan T." price={485} you={false} />
                <Bid name="You" price={478} you={true} />
                <Bid name="Buyer 47" price={470} you={false} />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Network size={14} className="text-emerald-600" />
                  On-chain ID #142 · tx 0x4f...d8a3
                </div>
              </div>
            </div>
          </div>
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

function Stat({ n, label }) {
  return (
    <div>
      <div className="font-bold text-slate-900">{n}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Bid({ name, price, you }) {
  return (
    <div className={`flex justify-between p-2 rounded ${you ? 'bg-emerald-50' : 'bg-slate-50'}`}>
      <span className={you ? 'font-medium text-emerald-700' : 'text-slate-600'}>{name}</span>
      <span className="font-mono text-slate-900">₹{price}/kg</span>
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