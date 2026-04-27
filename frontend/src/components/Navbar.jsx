import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice.js';
import toast from 'react-hot-toast';
import {
  Sprout, Home, Search, BarChart3, ShoppingBag, Tractor,
  Shield, LogOut, LogIn, UserPlus, Wallet, Gavel,
} from 'lucide-react';

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const loc = useLocation();

  function doLogout() {
    dispatch(logout());
    toast.success('signed out');
    nav('/login');
  }

  const NavLink = ({ to, icon: Icon, children }) => {
    const active = loc.pathname === to || (to !== '/' && loc.pathname.startsWith(to));
    return (
      <Link
        to={to}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
          active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Icon size={16} />
        {children}
      </Link>
    );
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white">
            <Sprout size={18} />
          </div>
          <span className="hidden sm:inline">Areca<span className="text-emerald-600">Auction</span></span>
        </Link>

        <div className="flex items-center gap-1 flex-1 justify-end overflow-x-auto">
          <NavLink to="/"          icon={Home}>home</NavLink>
          <NavLink to="/lots"      icon={Search}>browse</NavLink>
          <NavLink to="/analytics" icon={BarChart3}>analytics</NavLink>

          {user?.role === 'farmer' && <NavLink to="/farmer" icon={Tractor}>farmer</NavLink>}
          {user?.role === 'buyer' && (
            <>
                <NavLink to="/buyer"      icon={ShoppingBag}>buyer</NavLink>
                <NavLink to="/buyer/bids" icon={Gavel}>my bids</NavLink>
            </>
          )}
          {user?.role === 'admin'  && <NavLink to="/admin"  icon={Shield}>admin</NavLink>}

          <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />

          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 px-3 text-sm">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <div className="font-medium text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                </div>
              </div>
              <button onClick={doLogout} className="btn-ghost text-sm" title="logout">
                <LogOut size={16} />
                <span className="hidden sm:inline">logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">
                <LogIn size={16} /> login
              </Link>
              <Link to="/register" className="btn-primary text-sm">
                <UserPlus size={16} /> register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}