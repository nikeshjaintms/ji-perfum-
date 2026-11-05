import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
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
      errors.email = 'Please enter a valid work email (e.g. cashier@jiperfume.com).';
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-3 sm:px-6 lg:px-8 py-4 sm:py-8 relative overflow-x-hidden overflow-y-auto selection:bg-[#2244A4] selection:text-white">
      
      {/* 1. Photorealistic Luxury Perfume Boutique Interior Background (Parisian Balcony & Golden Display) */}
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat transition-all duration-700" 
        style={{
          backgroundImage: "url('/boutique_luxury_bg.png?v=3')",
        }}
        aria-hidden="true" 
      />

      {/* 2. Soft Ambient Tint & Diffused Blur */}
      <div 
        className="fixed inset-0 pointer-events-none bg-slate-900/20 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      {/* 3. Subtle Warm Ambient Halo behind the card */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="w-[620px] h-[620px] bg-blue-500/15 rounded-full blur-3xl" />
      </div>

      {/* 4. The Master Luxury Login Card */}
      <div className="relative z-10 w-full max-w-[460px] lg:max-w-[880px] bg-white rounded-[22px] sm:rounded-[30px] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.7)] overflow-hidden flex flex-col lg:flex-row my-auto border border-slate-200/80">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Boutique Brand Identity (Logo-Matched Soft Ice-Blue Porcelain) */}
        {/* ============================================================ */}
        <div className="relative bg-gradient-to-br from-[#ffffff] via-[#f0f6ff] to-[#dce9fa] text-slate-800 lg:w-[44%] shrink-0 p-5 sm:p-7 lg:p-10 flex flex-col justify-between items-center text-center overflow-hidden min-h-[160px] sm:min-h-[190px] lg:min-h-[490px] border-b lg:border-b-0 lg:border-r border-blue-100/50">
          
          {/* Subtle radial luxury glow */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent" />

          {/* Delicate botanical fragrance blossom watermark (bottom-left) */}
          <svg
            className="absolute -bottom-8 -left-8 w-44 h-44 sm:w-56 sm:h-56 text-blue-600/10 pointer-events-none select-none"
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            aria-hidden="true"
          >
            <circle cx="100" cy="100" r="14" stroke="#D4AF37" strokeWidth="1" opacity="0.6" />
            <path d="M 100 100 C 90 60, 60 40, 100 20 C 140 40, 110 60, 100 100 Z" />
            <path d="M 100 100 C 60 90, 40 60, 20 100 C 40 140, 60 110, 100 100 Z" />
            <path d="M 100 100 C 110 140, 140 160, 100 180 C 60 160, 90 140, 100 100 Z" />
            <path d="M 100 100 C 140 110, 160 140, 180 100 C 160 60, 140 90, 100 100 Z" />
            <path d="M 100 100 C 70 70, 45 45, 45 45 C 80 55, 95 85, 100 100 Z" opacity="0.5" />
            <path d="M 100 100 C 130 70, 155 45, 155 45 C 120 55, 105 85, 100 100 Z" opacity="0.5" />
            <path d="M 100 100 C 70 130, 45 155, 45 155 C 80 145, 95 115, 100 100 Z" opacity="0.5" />
            <path d="M 100 100 C 130 130, 155 155, 155 155 C 120 145, 105 115, 100 100 Z" opacity="0.5" />
          </svg>

          {/* Top spacer for balanced vertical alignment on desktop */}
          <div className="hidden lg:block w-full h-2" />

          {/* Center Brand Identity */}
          <div className="relative z-10 my-auto flex flex-col items-center max-w-[280px]">
            
            {/* The Official JI PERFUME Transparent Logo */}
            <div className="relative mb-1.5 flex items-center justify-center">
              <img
                src="/logo_transparent.png"
                alt="JI Perfume"
                className="h-11 sm:h-14 lg:h-16 w-auto max-w-[200px] sm:max-w-[240px] lg:max-w-[260px] object-contain drop-shadow-[0_4px_12px_rgba(11,62,181,0.15)]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling;
                  if (fb) fb.classList.remove('hidden');
                }}
              />
              <div className="hidden flex flex-col items-center">
                <span className="font-serif text-xl sm:text-2xl font-bold text-[#2244A4] tracking-tight">JI PERFUME</span>
                <span className="text-[9px] sm:text-[10px] tracking-[0.25em] text-[#D4AF37] font-semibold uppercase">HAUTE PARFUMERIE</span>
              </div>
            </div>

            {/* Sub-brand / Portal tag */}
            <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-semibold tracking-[0.25em] text-[#2244A4] uppercase mt-1">
              BOUTIQUE ERP PORTAL
            </p>

            {/* Metallic Gold Accent Divider */}
            <div className="w-14 sm:w-16 h-[2px] bg-gradient-to-r from-transparent via-[#E2B755] to-transparent mt-2 sm:mt-2.5 rounded-full shadow-xs" />
          </div>

          {/* Bottom subtle note or tag */}
          <div className="hidden lg:block relative z-10 text-[10px] text-[#2244A4]/70 tracking-wider uppercase mt-4 lg:mt-0 font-medium">
            Fine Fragrance Management
          </div>

          {/* Desktop S-Curve Wave Separator with Champagne Gold Border */}
          <div className="hidden lg:block absolute top-0 bottom-0 -right-[1px] w-12 lg:w-14 h-full pointer-events-none z-10">
            <svg
              viewBox="0 0 50 500"
              preserveAspectRatio="none"
              className="h-full w-full"
              aria-hidden="true"
            >
              {/* Warm luxury ivory filler seamlessly merging into right column */}
              <path
                d="M 12,0 C -2,140 46,310 16,500 L 50,500 L 50,0 Z"
                fill="#FAF8F5"
              />
              {/* Champagne Gold Metallic Accent Border */}
              <path
                d="M 12,0 C -2,140 46,310 16,500"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Mobile/Tablet Bottom Wave Separator with Gold Stroke (< lg) */}
          <div className="lg:hidden absolute -bottom-[1px] left-0 right-0 h-5 sm:h-6 w-full pointer-events-none z-10">
            <svg
              viewBox="0 0 500 40"
              preserveAspectRatio="none"
              className="h-full w-full"
              aria-hidden="true"
            >
              <path
                d="M 0,10 Q 125,35 250,15 T 500,20 L 500,40 L 0,40 Z"
                fill="#FAF8F5"
              />
              <path
                d="M 0,10 Q 125,35 250,15 T 500,20"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="2"
              />
            </svg>
          </div>

        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Warm Luxury Ivory Silk Authentication Form */}
        {/* ============================================================ */}
        <div className="flex-1 p-5 sm:p-7 lg:p-10 flex flex-col justify-center bg-[#FAF8F5] relative z-0">
          
          {/* Header */}
          <div className="mb-4 sm:mb-5">
            <h2 className="font-serif text-xl sm:text-3xl lg:text-[26px] text-center font-bold text-slate-900 tracking-tight leading-tight">
              Sign In
            </h2>
            
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div role="alert" className="mb-3.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 sm:p-3 flex items-start gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleLoginSubmit} noValidate className="space-y-3 sm:space-y-3.5">
            
            {/* Field: Work Email */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <Mail className="w-3.5 h-3.5 text-slate-600" />
                <span>Email</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  placeholder="cashier@jiperfume.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition shadow-2xs ${
                    loginErrors.email && loginTouched.email
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 hover:border-slate-300 focus:border-[#2244A4] focus:ring-2 focus:ring-[#2244A4]/15'
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

            {/* Field: Password */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>Password</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                  className={`w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white border rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition shadow-2xs ${
                    loginErrors.password && loginTouched.password
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 hover:border-slate-300 focus:border-[#2244A4] focus:ring-2 focus:ring-[#2244A4]/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer transition"
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

            {/* Submit Button (Matching Exact User Blue rgb(34 68 164)) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-[#2244A4] hover:bg-[#1C3786] active:bg-[#162C6B] disabled:opacity-60 text-white font-medium rounded-xl text-xs sm:text-sm transition-all shadow-md hover:shadow-lg cursor-pointer mt-1 flex items-center justify-center gap-2 group"
            >
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span>{loading ? 'Authenticating…' : 'Sign In to Boutique ERP'}</span>
            </button>
          </form>

          {/* Security Notice Box */}
          <div className="mt-3.5 p-2 sm:p-2.5 bg-white/90 rounded-xl border border-slate-200/90 text-[10px] sm:text-[11px] text-slate-600 flex items-center gap-2 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>New staff accounts are provisioned securely by your Administrator.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
