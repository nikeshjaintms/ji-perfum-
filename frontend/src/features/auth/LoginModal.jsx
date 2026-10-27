import React, { useState } from 'react';
import { authService } from '../../services/api';

const DEMO_ACCOUNTS = [
  { label: 'Cashier', email: 'cashier@jjperfume.com', password: 'cashier123' },
  { label: 'Owner', email: 'admin@jjperfume.com', password: 'admin123' },
];

export default function LoginModal({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const signIn = async (loginEmail, loginPassword) => {
    try {
      setLoading(true);
      setErrorMsg('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    signIn(email, password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50">
      <div className="bg-white rounded-lg max-w-sm w-full p-7 shadow-lg">
        <img src="/logo.webp" alt="JJ Perfume" className="h-12 w-auto object-contain mb-5" />
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Sign in</h2>
        <p className="text-sm text-slate-500 mt-1">Use the email and password your owner gave you.</p>

        {errorMsg && (
          <p role="alert" className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 focus:border-amber-500 rounded-md text-sm text-slate-900 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 focus:border-amber-500 rounded-md text-sm text-slate-900 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-md text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <p className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500">
            Development accounts:{' '}
            {DEMO_ACCOUNTS.map((acc, i) => (
              <span key={acc.email}>
                {i > 0 && ' · '}
                <button
                  type="button"
                  onClick={() => signIn(acc.email, acc.password)}
                  className="underline underline-offset-2 hover:text-slate-900"
                >
                  {acc.label}
                </button>
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}
