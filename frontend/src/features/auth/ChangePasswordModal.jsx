import React, { useState, useEffect } from 'react';
import { 
  X, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { authService } from '../../services/api';

export default function ChangePasswordModal({ isOpen, onClose, currentUser }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setErrorMsg('');
      setSuccessMsg('');
      setFieldErrors({});
      setTouched({});
    }
  }, [isOpen]);

  // Support ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const errors = {};
    const cleanCurrent = (currentPassword || '').trim();
    const cleanNew = (newPassword || '').trim();
    const cleanConfirm = (confirmPassword || '').trim();

    if (!cleanCurrent) {
      errors.currentPassword = 'Current password is required.';
    }

    if (!cleanNew) {
      errors.newPassword = 'New password is required.';
    } else if (cleanNew.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters.';
    } else if (cleanCurrent && cleanNew === cleanCurrent) {
      errors.newPassword = 'New password must be different from current password.';
    }

    if (!cleanConfirm) {
      errors.confirmPassword = 'Confirm your new password.';
    } else if (cleanConfirm !== cleanNew) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ currentPassword: true, newPassword: true, confirmPassword: true });
    setErrorMsg('');
    setSuccessMsg('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const cleanCurrent = (currentPassword || '').trim();
    const cleanNew = (newPassword || '').trim();

    try {
      setLoading(true);
      const res = await authService.changePassword({ 
        currentPassword: cleanCurrent, 
        newPassword: cleanNew 
      });
      if (res.success) {
        setSuccessMsg(res.message || 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFieldErrors({});
        setTouched({});
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res.message || 'Failed to update password.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header decoration */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-600" />

        <div className="p-6">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-xs">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 id="change-password-title" className="text-lg font-serif font-bold text-slate-900">
                  Change Password
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Secure your account: <span className="font-medium text-slate-700">{currentUser?.email || currentUser?.name || 'Staff User'}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 font-medium">{successMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Hidden username field for browser password managers (Chrome/Edge/Safari) to recognize account update */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              value={currentUser?.email || ''}
              readOnly
              tabIndex={-1}
              className="sr-only opacity-0 h-0 w-0 absolute pointer-events-none"
              aria-hidden="true"
            />

            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (fieldErrors.currentPassword) {
                      setFieldErrors((prev) => ({ ...prev, currentPassword: undefined }));
                    }
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, currentPassword: true }))}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  disabled={loading || !!successMsg}
                  className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                    fieldErrors.currentPassword && touched.currentPassword
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.currentPassword && touched.currentPassword && (
                <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.currentPassword}</span>
                </p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) {
                      setFieldErrors((prev) => ({ ...prev, newPassword: undefined }));
                    }
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, newPassword: true }))}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={loading || !!successMsg}
                  className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                    fieldErrors.newPassword && touched.newPassword
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.newPassword && touched.newPassword && (
                <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.newPassword}</span>
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm New Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  disabled={loading || !!successMsg}
                  className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all ${
                    fieldErrors.confirmPassword && touched.confirmPassword
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && touched.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{fieldErrors.confirmPassword}</span>
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading || !!successMsg}
                className="px-5 py-2 text-xs font-medium text-white bg-[#2F5D4E] hover:bg-[#254b3e] active:scale-[0.98] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
