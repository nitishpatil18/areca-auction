import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, UserPlus, Sprout, Tractor, ShoppingBag, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerThunk } from '../store/authSlice.js';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'buyer', region: '',
  });
  const [show, setShow] = useState(false);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { status } = useSelector((s) => s.auth);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const action = await dispatch(registerThunk(form));
    if (action.meta.requestStatus === 'fulfilled') {
      toast.success(`Account created. Welcome, ${action.payload.user.name}`);
      nav('/');
    } else {
      toast.error(action.error.message);
    }
  }

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-emerald-50 to-white">
      <div className="card p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white">
            <Sprout size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Create Account</h1>
            <p className="text-xs text-slate-500">Start trading in minutes</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field icon={User}   label="Full Name"  value={form.name}     onChange={set('name')}     placeholder="Your name" required />
          <Field icon={Mail}   label="Email"      value={form.email}    onChange={set('email')}    placeholder="you@example.com" type="email" required />
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={show ? 'text' : 'password'}
                className="input pl-9 pr-10"
                placeholder="Min 8 characters"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={form.password} />
          </div>
          <Field icon={MapPin} label="Region"     value={form.region}   onChange={set('region')}   placeholder="e.g. Shivamogga" />

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">I am a</label>
            <div className="grid grid-cols-2 gap-2">
              <RoleOption
                icon={ShoppingBag}
                label="Buyer"
                description="Bid on lots"
                active={form.role === 'buyer'}
                onClick={() => setForm((f) => ({ ...f, role: 'buyer' }))}
              />
              <RoleOption
                icon={Tractor}
                label="Farmer"
                description="List your lots"
                active={form.role === 'farmer'}
                onClick={() => setForm((f) => ({ ...f, role: 'farmer' }))}
              />
            </div>
          </div>

          <button disabled={status === 'loading'} className="btn-primary w-full">
            <UserPlus size={16} />
            {status === 'loading' ? 'Creating…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700 mb-1 block">{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" {...props} />
      </div>
    </div>
  );
}

function RoleOption({ icon: Icon, label, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 border-2 rounded-lg text-left transition ${
        active
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <Icon size={20} className={active ? 'text-emerald-600' : 'text-slate-500'} />
      <div className="font-semibold text-sm mt-1.5">{label}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </button>
  );
}
function PasswordStrength({ password }) {
  if (!password) return null;
  // simple scoring: length, lowercase, uppercase, digit, symbol
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const tiers = [
    { label: 'Very weak', color: 'bg-red-500',    width: '20%' },
    { label: 'Weak',      color: 'bg-orange-500', width: '40%' },
    { label: 'Fair',      color: 'bg-yellow-500', width: '60%' },
    { label: 'Good',      color: 'bg-emerald-500', width: '80%' },
    { label: 'Strong',    color: 'bg-emerald-600', width: '100%' },
  ];
  const tier = tiers[Math.min(score - 1, tiers.length - 1)] || tiers[0];
  return (
    <div className="mt-2">
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${tier.color} transition-all`} style={{ width: tier.width }} />
      </div>
      <p className="text-xs text-slate-500 mt-1">Strength: {tier.label}</p>
    </div>
  );
}

