import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  Shield, 
  AlertCircle, 
  LogIn,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { authService } from '../../services/api';

const DEMO_ACCOUNTS = [
  { label: 'Cashier Counter', email: 'cashier@jjperfume.com', password: 'cashier123' },
  { label: 'Boutique Owner', email: 'admin@jjperfume.com', password: 'admin123' },
];

export default function LoginModal({ onLoginSuccess }) {
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginErrors, setLoginErrors] = useState({});
  const [loginTouched, setLoginTouched] = useState({});

  const signIn = async (loginEmail, loginPassword) => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await authService.login(loginEmail, loginPassword);
      if (res.success && res.data?.user) {
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || 'Invalid credentials or inactive account. Please check both and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const validateLogin = () => {
    const errors = {};
    const emailTrim = (email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrim) {
      errors.email = 'Work email is required.';
    } else if (!emailRegex.test(emailTrim)) {
      errors.email = 'Please enter a valid work email (e.g. cashier@jjperfume.com).';
    }

    if (!password || !password.trim()) {
      errors.password = 'Password is required.';
    }
    return errors;
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginTouched({ email: true, password: true });
    const errors = validateLogin();
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    signIn((email || '').trim(), (password || '').trim());
  };

  const handleQuickDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoginErrors({});
    setLoginTouched({});
    signIn(demoEmail, demoPassword);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden overflow-y-auto selection:bg-amber-600 selection:text-white">
      
      {/* 1. Photorealistic Luxury Perfume Boutique Background */}
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat" 
        style={{
          backgroundImage: "url('/boutique_luxury_bg.jpg')",
        }}
        aria-hidden="true" 
      />

      {/* 2. Soft Warm Ambient Tint & Diffused Vignette */}
      <div 
        className="fixed inset-0 pointer-events-none bg-gradient-to-t from-slate-950/45 via-black/20 to-slate-900/30 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      {/* 3. Subtle Warm Halo directly behind the card */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="w-[580px] h-[580px] bg-amber-200/25 rounded-full blur-3xl" />
      </div>

      {/* The Login Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.7)] border border-slate-200/90 text-slate-900 my-auto max-h-[95vh] overflow-y-auto no-scrollbar relative z-10">
        
        {/* Boutique Brand Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
          <img
            src="/logo.webp"
            alt="JI Perfume"
            className="h-10 sm:h-12 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              JI Perfume
            </h1>
            <p className="text-[11px] text-amber-700 font-semibold tracking-wider uppercase">
              Boutique ERP Portal
            </p>
          </div>
        </div>

        {/* Title & Context */}
        <div className="mb-5">
          <h2 className="font-serif text-lg font-semibold text-slate-900">
            Sign in to Counter
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Authentication is strictly required. Enter the authorized staff credentials assigned to you by your store administrator.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div role="alert" className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (loginErrors.email) {
                    setLoginErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                onBlur={() => setLoginTouched((prev) => ({ ...prev, email: true }))}
                placeholder="cashier@jjperfume.com"
                className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none transition shadow-2xs ${
                  loginErrors.email && loginTouched.email
                    ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                    : 'border-slate-300 focus:border-amber-500 focus:bg-white'
                }`}
              />
            </div>
            {loginErrors.email && loginTouched.email && (
              <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{loginErrors.email}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (loginErrors.password) {
                    setLoginErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                onBlur={() => setLoginTouched((prev) => ({ ...prev, password: true }))}
                placeholder="••••••••"
                className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none transition shadow-2xs ${
                  loginErrors.password && loginTouched.password
                    ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                    : 'border-slate-300 focus:border-amber-500 focus:bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {loginErrors.password && loginTouched.password && (
              <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{loginErrors.password}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl text-xs sm:text-sm transition-all shadow-md hover:shadow-lg cursor-pointer mt-2 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating…' : 'Sign in to Boutique ERP'}</span>
          </button>
        </form>

        {/* Security Notice */}
        <div className="mt-5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>New staff accounts are provisioned securely by your Administrator.</span>
        </div>

      </div>
    </div>
  );
}
