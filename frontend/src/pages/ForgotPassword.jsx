import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Sprout, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as authApi from '../api/auth.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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
            <h1 className="text-xl font-bold">Forgot Password</h1>
            <p className="text-xs text-slate-500">
              {sent ? 'Check your email for the reset link' : 'Enter your email to get a reset link'}
            </p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-emerald-900">Reset link sent</p>
                <p className="text-emerald-700 mt-1">
                  If <span className="font-medium">{email}</span> is registered, a reset link has been sent.
                  The link expires in 1 hour.
                </p>
                <p className="text-emerald-700 mt-2 text-xs">
                  Demo note: no real email is sent. Ask the admin for your reset token.
                </p>
              </div>
            </div>
            <Link to="/login" className="btn-secondary w-full justify-center">
              <ArrowLeft size={16} />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <button disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <Link to="/login" className="text-sm text-slate-500 hover:text-emerald-600 flex items-center justify-center gap-1">
              <ArrowLeft size={14} />
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
