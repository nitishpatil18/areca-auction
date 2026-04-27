import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, UserPlus, Sprout, Tractor, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerThunk } from '../store/authSlice.js';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'buyer', region: '',
  });
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { status } = useSelector((s) => s.auth);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    const action = await dispatch(registerThunk(form));
    if (action.meta.requestStatus === 'fulfilled') {
      toast.success(`account created. welcome, ${action.payload.user.name}`);
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
            <h1 className="text-xl font-bold">create account</h1>
            <p className="text-xs text-slate-500">start trading in minutes</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field icon={User}   label="full name"      value={form.name}     onChange={set('name')}     placeholder="your name" required />
          <Field icon={Mail}   label="email"          value={form.email}    onChange={set('email')}    placeholder="you@example.com" type="email" required />
          <Field icon={Lock}   label="password"       value={form.password} onChange={set('password')} placeholder="min 8 characters" type="password" required />
          <Field icon={MapPin} label="region"         value={form.region}   onChange={set('region')}   placeholder="e.g. Shivamogga" />

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">i am a</label>
            <div className="grid grid-cols-2 gap-2">
              <RoleOption
                icon={ShoppingBag}
                label="buyer"
                description="bid on lots"
                active={form.role === 'buyer'}
                onClick={() => setForm((f) => ({ ...f, role: 'buyer' }))}
              />
              <RoleOption
                icon={Tractor}
                label="farmer"
                description="list your lots"
                active={form.role === 'farmer'}
                onClick={() => setForm((f) => ({ ...f, role: 'farmer' }))}
              />
            </div>
          </div>

          <button disabled={status === 'loading'} className="btn-primary w-full">
            <UserPlus size={16} />
            {status === 'loading' ? 'creating…' : 'create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600 text-center">
          already have an account?{' '}
          <Link to="/login" className="text-emerald-600 font-medium hover:underline">
            sign in
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
      <div className="font-semibold text-sm mt-1.5 capitalize">{label}</div>
      <div className="text-xs text-slate-500">{description}</div>
    </button>
  );
}