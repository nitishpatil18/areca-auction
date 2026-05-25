import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from './hooks/useSocket.js';
import { notificationReceived } from './store/notificationsSlice.js';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import BrowseLots from './pages/BrowseLots.jsx';
import LotDetail from './pages/LotDetail.jsx';
import FarmerDashboard from './pages/FarmerDashboard.jsx';
import BuyerDashboard from './pages/BuyerDashboard.jsx';
import Wallet from './pages/Wallet.jsx';
import { meThunk } from './store/authSlice.js';
import Analytics from './pages/Analytics.jsx';
import Admin from './pages/Admin.jsx';
import MyBids from './pages/MyBids.jsx';

function Stub({ title }) {
  return <div className="max-w-3xl mx-auto px-4 py-12 text-slate-600">
    <h1 className="text-2xl font-bold mb-2">{title}</h1>
    <p>coming next batch.</p>
  </div>;
}

export default function App() {
  const dispatch = useDispatch();
  const { token } = useSelector((s) => s.auth);

  useEffect(() => {
    if (token) dispatch(meThunk());
  }, [token, dispatch]);
  // global socket listener for incoming notifications
  const socketRef = useSocket();
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onNew = (n) => {
      dispatch(notificationReceived(n));
      toast(n.title, { icon: '🔔', duration: 4000 });
    };
    socket.on('notification:new', onNew);
    return () => { socket.off('notification:new', onNew); };
  }, [socketRef, dispatch, token]);


  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/"         element={<Home />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/lots"     element={<BrowseLots />} />
        <Route path="/lots/:id" element={<LotDetail />} />

        <Route path="/farmer" element={
          <ProtectedRoute roles={['farmer']}><FarmerDashboard /></ProtectedRoute>
        } />
        <Route path="/buyer" element={
          <ProtectedRoute roles={['buyer']}><BuyerDashboard /></ProtectedRoute>
        } />
        <Route path="/buyer/bids" element={
          <ProtectedRoute roles={['buyer']}><MyBids /></ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute roles={['buyer']}><Wallet /></ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}><Admin /></ProtectedRoute>
        } />
        <Route path="/analytics" element={<Analytics />} />

        <Route path="*" element={<div className="p-12 text-center text-slate-500">not found</div>} />
      </Routes>
    </BrowserRouter>
  );
}