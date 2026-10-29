import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/DataTable';
import { Users, Plus, Shield, CheckCircle2, UserPlus, RefreshCw, X, AlertCircle } from 'lucide-react';
import { userService } from '../../services/api';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'CASHIER' });
  const [formErrors, setFormErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateUserForm = () => {
    const errors = {};
    const nameTrim = (formData.name || '').trim();
    if (!nameTrim) {
      errors.name = 'Full name is required';
    } else if (nameTrim.length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }

    const emailTrim = (formData.email || '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrim) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(emailTrim)) {
      errors.email = 'Please enter a valid email address (e.g. rahul@jjperfume.com)';
    }

    if (!formData.password) {
      errors.password = 'Temporary password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    return errors;
  };

  const handleOpenAddModal = () => {
    setFormData({ name: '', email: '', password: '', role: 'CASHIER' });
    setFormErrors({});
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const validationErrors = validateUserForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFormErrors({});

    try {
      setSubmitting(true);
      setErrorMsg('');
      await userService.createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'CASHIER' });
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Name',
      sortAccessor: (u) => u.name,
      sortable: true,
      render: (_, user) => (
        <div className="font-medium text-slate-900 flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-700 flex items-center justify-center font-bold text-xs font-serif">
            {user.name.charAt(0)}
          </div>
          <span>{user.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      accessor: 'email',
      sortable: true,
      className: 'tabular-nums text-slate-500 font-light',
    },
    {
      key: 'role',
      header: 'Role',
      sortAccessor: (u) => u.role,
      sortable: true,
      render: (role) => (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <Shield className="w-3 h-3 text-amber-600" />
          <span>{{ SUPER_ADMIN: 'Owner', STORE_MANAGER: 'Store manager', CASHIER: 'Cashier' }[role] || role}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      render: () => (
        <span className="inline-flex items-center space-x-1.5 text-emerald-600 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Active</span>
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Added on',
      accessor: 'createdAt',
      sortable: true,
      className: 'text-slate-500 font-light',
      render: (val) => new Date(val).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    },
  ], []);

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-slate-900">Staff</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Who can sign in, and what they are allowed to do.</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition shadow-md flex items-center space-x-1.5 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add staff</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchPlaceholder="Instant search staff name, email, role..."
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50]}
        emptyIcon={Users}
        emptyMessage="No staff members found"
        emptySubtext="Use 'Add staff' to invite cashiers and store managers."
        initialSort={{ key: 'name', direction: 'asc' }}
      />

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 shadow-xl text-slate-900">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-700 font-semibold block">Credential</span>
                  <h3 className="text-base font-serif text-slate-900">
                    Add staff
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3.5 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* FORM WITHOUT HTML5 VALIDATION POPUPS (noValidate) */}
            <form noValidate onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. Rahul Verma"
                  className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 focus:outline-none transition shadow-sm border ${
                    formErrors.name
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{formErrors.name}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="rahul@jjperfume.com"
                  className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 tabular-nums focus:outline-none transition shadow-sm border ${
                    formErrors.email
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                  }`}
                />
                {formErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{formErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Temporary Password <span className="text-rose-600">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 focus:outline-none transition shadow-sm border ${
                    formErrors.password
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                  }`}
                />
                {formErrors.password && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{formErrors.password}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Role Authorization <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    setFormData({ ...formData, role: e.target.value });
                    if (formErrors.role) setFormErrors((prev) => ({ ...prev, role: '' }));
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 focus:outline-none cursor-pointer shadow-sm"
                >
                  <option value="CASHIER" className="bg-white text-slate-900">Cashier / Billing Specialist</option>
                  <option value="STORE_MANAGER" className="bg-white text-slate-900">Store manager</option>
                  <option value="SUPER_ADMIN" className="bg-white text-slate-900">Executive Super Admin</option>
                </select>
                {formErrors.role && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{formErrors.role}</span>
                  </p>
                )}
              </div>

              <div className="pt-3.5 border-t border-slate-200 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition shadow-md cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Creating...' : 'Grant Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
