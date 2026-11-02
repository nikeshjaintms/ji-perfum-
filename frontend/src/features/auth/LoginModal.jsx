import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  LogIn,
  UserPlus,
  UserCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { authService } from '../../services/api';

const DEMO_ACCOUNTS = [
  { label: 'Cashier', email: 'cashier@jjperfume.com', password: 'cashier123' },
  { label: 'Owner', email: 'admin@jjperfume.com', password: 'admin123' },
];

export default function LoginModal({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loginErrors, setLoginErrors] = useState({});
  const [loginTouched, setLoginTouched] = useState({});

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('CASHIER');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  const signIn = async (loginEmail, loginPassword) => {
    try {
      setLoading(true);
      setErrorMsg('');
      setRegSuccessMsg('');
      const res = await authService.login(loginEmail, loginPassword);
      if (res.success && res.data?.user) {
        onLoginSuccess(res.data.user);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Email or password is wrong. Check both and try again.');
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

  const validateRegister = () => {
    const errors = {};
    const nameTrim = (regName || '').trim();
    if (!nameTrim) {
      errors.name = 'Full name is required';
    } else if (nameTrim.length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }

    const emailTrim = (regEmail || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrim) {
      errors.email = 'Work email address is required';
    } else if (!emailRegex.test(emailTrim)) {
      errors.email = 'Please enter a valid work email (e.g. name@jjperfume.com)';
    }

    if (!regPassword) {
      errors.password = 'Password is required';
    } else if (regPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return errors;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const errors = validateRegister();
    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }
    setRegErrors({});

    try {
      setRegSubmitting(true);
      setErrorMsg('');
      setRegSuccessMsg('');

      const registeredName = (regName || '').trim();
      const registeredEmail = (regEmail || '').trim();
      const registeredPassword = (regPassword || '').trim();

      const res = await authService.register({
        name: registeredName,
        email: registeredEmail,
        password: registeredPassword,
        role: regRole,
      });

      if (res.success) {
        // 1. Clear registration inputs
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegErrors({});

        // 2. Pre-fill login input with registered email for fast sign-in
        setEmail(registeredEmail);
        setPassword('');
        setLoginErrors({});
        setLoginTouched({});

        // 3. Set friendly success message on the login screen
        setRegSuccessMsg(res.message || `Account for ${registeredName} created successfully! Please sign in.`);

        // 4. Redirect immediately to the Sign In page
        setAuthMode('login');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'An unexpected error occurred during registration.');
    } finally {
      setRegSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden overflow-y-auto selection:bg-amber-600 selection:text-white">
      
      {/* 1. Photorealistic Luxury Perfume Boutique Interior Background */}
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat" 
        style={{
          backgroundImage: "url('/boutique_luxury_bg.jpg')",
        }}
        aria-hidden="true" 
      />

      {/* 2. Soft Warm Ambient Tint & Diffused Vignette */}
      <div 
        className="fixed inset-0 pointer-events-none bg-gradient-to-t from-slate-950/35 via-black/10 to-slate-900/20 backdrop-blur-[1px]"
        aria-hidden="true"
      />

      {/* 3. Subtle Warm Center Halo directly behind the card */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="w-[560px] h-[560px] bg-amber-100/30 rounded-full blur-3xl" />
      </div>
      {/* The Login Card: Exactly unchanged */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.7)] border border-slate-200/90 text-slate-900 my-auto max-h-[95vh] overflow-y-auto no-scrollbar relative z-10">
        
        {/* Boutique Brand Header */}
        <div className="flex items-center space-x-3 mb-4">
          <img
            src="/logo.webp"
            alt="JI Perfume"
            className="h-10 sm:h-11 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
              JI Perfume
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Boutique Counter ERP
            </p>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setErrorMsg(''); setRegSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === 'login'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-amber-700" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMsg(''); setRegSuccessMsg(''); }}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              authMode === 'register'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-700" />
            <span>Register Account</span>
          </button>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div role="alert" className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {regSuccessMsg && (
          <div role="status" className="mb-4 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{regSuccessMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* 1. SIGN IN FORM */}
        {/* ============================================================== */}
        {authMode === 'login' && (
          <>
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">Sign in to your counter</h2>
              <p className="text-xs text-slate-500 mt-0.5">Use the email and credentials authorized by your boutique administrator.</p>
            </div>

            <form onSubmit={handleLoginSubmit} noValidate className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
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
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none transition shadow-2xs ${
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
                <label className="block text-xs font-medium text-slate-700 mb-1">
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
                    className={`w-full pl-9 pr-10 py-2 bg-slate-50 border rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none transition shadow-2xs ${
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
                className="w-full py-2.5 sm:py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-lg text-xs sm:text-sm transition-colors shadow-md cursor-pointer mt-1 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Signing in…' : 'Sign in to Boutique ERP'}</span>
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Need a new account?</span>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMsg(''); }}
                className="text-amber-700 hover:text-amber-900 font-semibold underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
              >
                <span>Register staff account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* 2. REGISTER FORM */}
        {/* ============================================================== */}
        {authMode === 'register' && (
          <>
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-900">Register Staff Account</h2>
              <p className="text-xs text-slate-500 mt-0.5">Create your boutique profile to access counter POS and inventory.</p>
            </div>

            <form noValidate onSubmit={handleRegisterSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => {
                      setRegName(e.target.value);
                      if (regErrors.name) setRegErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="e.g. Rahul Verma"
                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none transition shadow-2xs border ${
                      regErrors.name
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:border-amber-500 bg-slate-50 focus:bg-white'
                    }`}
                  />
                </div>
                {regErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{regErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Work Email <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (regErrors.email) setRegErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    placeholder="rahul@jjperfume.com"
                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none transition shadow-2xs border ${
                      regErrors.email
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:border-amber-500 bg-slate-50 focus:bg-white'
                    }`}
                  />
                </div>
                {regErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{regErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Role Authorization <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none transition cursor-pointer shadow-2xs"
                  >
                    <option value="CASHIER">Cashier / Billing Specialist</option>
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="SUPER_ADMIN">Boutique Owner / Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        if (regErrors.password) setRegErrors((prev) => ({ ...prev, password: '' }));
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-9 pr-8 py-2 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none transition shadow-2xs border ${
                        regErrors.password
                          ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:border-amber-500 bg-slate-50 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {regErrors.password && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{regErrors.password}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        if (regErrors.confirmPassword) setRegErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none transition shadow-2xs border ${
                        regErrors.confirmPassword
                          ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                          : 'border-slate-300 focus:border-amber-500 bg-slate-50 focus:bg-white'
                      }`}
                    />
                  </div>
                  {regErrors.confirmPassword && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{regErrors.confirmPassword}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={regSubmitting}
                className="w-full py-2.5 sm:py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-lg text-xs sm:text-sm transition-colors shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{regSubmitting ? 'Registering Account…' : 'Register Staff Account'}</span>
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Already registered?</span>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                className="text-amber-700 hover:text-amber-900 font-semibold underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
              >
                <span>Sign in with credentials</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
