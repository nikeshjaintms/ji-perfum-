import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { authService } from '../../services/api';

export default function LoginModal({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await authService.login(email, password);
      if (res.success && res.data?.user) {
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setLoading(true);
    authService.login(quickEmail, quickPassword)
      .then((res) => {
        if (res.success && res.data?.user) {
          onLoginSuccess(res.data.user);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Login failed');
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
        
        {/* Subtle gold glow backdrop effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo Header */}
        <div className="text-center space-y-3 mb-6 relative">
          <div className="inline-block p-2.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
            <img 
              src="/logo.webp" 
              alt="JJ PERFUME" 
              className="h-12 w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(212,175,55,0.25)]"
            />
          </div>
          <div>
            <h2 className="text-2xl font-serif text-slate-900 tracking-tight">
              JJ PERFUME
            </h2>
            <p className="text-[10px] text-amber-600 uppercase tracking-[0.2em] font-semibold mt-0.5">
              Haute Parfumerie ERP & POS
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl text-center">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@jjperfume.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-semibold rounded-full text-xs tracking-wider transition shadow-md shadow-amber-950/20 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Boutique Register'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Fast Login Test Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="text-[11px] font-medium text-slate-500 text-center mb-2.5 flex items-center justify-center space-x-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Fast Role Demo Switch</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin('cashier@jjperfume.com', 'cashier123')}
              className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 hover:text-slate-900 transition text-center cursor-pointer"
            >
              🏪 Cashier POS
              <span className="block text-[9px] text-slate-500 font-mono mt-0.5">cashier@jjperfume.com</span>
            </button>

            <button
              onClick={() => handleQuickLogin('admin@jjperfume.com', 'admin123')}
              className="py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 hover:text-slate-900 transition text-center cursor-pointer"
            >
              👑 Super Admin
              <span className="block text-[9px] text-slate-500 font-mono mt-0.5">admin@jjperfume.com</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
