import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, CheckCircle2, UserPlus, RefreshCw, X } from 'lucide-react';
import { userService } from '../../services/api';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'CASHIER' });
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg('');
      await userService.createUser(formData);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'CASHIER' });
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-slate-900">Staff</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Who can sign in, and what they are allowed to do.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition shadow-md flex items-center space-x-1.5"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add staff</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm ">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-slate-500 bg-slate-50/80 font-semibold">
              <th className="py-3.5 px-4 font-normal">Name</th>
              <th className="py-3.5 px-4 font-normal">Email</th>
              <th className="py-3.5 px-4 font-normal">Role</th>
              <th className="py-3.5 px-4 font-normal">Status</th>
              <th className="py-3.5 px-4 font-normal">Added on</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {loading ? (
              <tr>
                <td colSpan="5" className="py-16 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2.5 opacity-80" />
                  <span className="text-xs text-slate-500 font-light">Loading staff credentials...</span>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                  <td className="py-3.5 px-4 font-medium text-slate-900 flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-700 flex items-center justify-center font-bold text-xs font-serif">
                      {user.name.charAt(0)}
                    </div>
                    <span>{user.name}</span>
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-slate-500 font-light">{user.email}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                      <Shield className="w-3 h-3 text-amber-600" />
                      <span>{{ SUPER_ADMIN: 'Owner', STORE_MANAGER: 'Store manager', CASHIER: 'Cashier' }[user.role] || user.role}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1.5 text-emerald-600 text-[11px] font-medium ">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-light">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 ">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 shadow-lg text-slate-900">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-700 font-semibold block">Credential</span>
                  <h3 className="text-base font-serif text-slate-900 ">
                    Add staff
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3.5 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Verma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rahul@jjperfume.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 tabular-nums focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 focus:outline-none transition shadow-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Role Authorization</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 focus:outline-none cursor-pointer shadow-sm"
                >
                  <option value="CASHIER" className="bg-white text-slate-900">Cashier / Billing Specialist</option>
                  <option value="STORE_MANAGER" className="bg-white text-slate-900">Store manager</option>
                  <option value="SUPER_ADMIN" className="bg-white text-slate-900">Executive Super Admin</option>
                </select>
              </div>

              <div className="pt-3.5 border-t border-slate-200 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition shadow-md "
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
