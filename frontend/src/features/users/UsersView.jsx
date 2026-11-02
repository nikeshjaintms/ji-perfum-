import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DataTable from '../../components/DataTable';
import { 
  Users, 
  Plus, 
  Shield, 
  CheckCircle2, 
  UserPlus, 
  RefreshCw, 
  X, 
  AlertCircle,
  Edit3,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { userService } from '../../services/api';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'CASHIER',
    isActive: true 
  });
  const [formErrors, setFormErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
      };

      if (search && search.trim()) {
        params.search = search.trim();
      }

      if (sortConfig && sortConfig.key) {
        params.sortBy = sortConfig.key;
        params.sortOrder = sortConfig.direction || 'asc';
      }

      const res = await userService.getUsers(params);
      setUsers(res.data || []);
      if (res.pagination) {
        setTotalUsers(res.pagination.total);
      } else {
        setTotalUsers((res.data || []).length);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortConfig]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSortChange = (newSort) => {
    setSortConfig(newSort);
    setPage(1);
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

    // Password is only required when creating a new user; for edit it is optional
    if (!editingUser) {
      if (!formData.password) {
        errors.password = 'Temporary password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'New password must be at least 6 characters';
    }

    if (!formData.role) {
      errors.role = 'Role is required';
    }

    return errors;
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'CASHIER', isActive: true });
    setFormErrors({});
    setErrorMsg('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'CASHIER',
      isActive: user.isActive !== undefined ? user.isActive : true,
    });
    setFormErrors({});
    setErrorMsg('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleSubmitUser = async (e) => {
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

      if (editingUser) {
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          isActive: formData.isActive,
        };
        if (formData.password && formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await userService.updateUser(editingUser.id, payload);
      } else {
        await userService.createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        });
      }

      setIsModalOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'CASHIER', isActive: true });
      fetchUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || (editingUser ? 'Failed to update staff' : 'Failed to create user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      setDeleteError('');
      await userService.deleteUser(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to remove staff member');
    } finally {
      setDeleting(false);
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
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (role) => (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
          <Shield className="w-3 h-3 text-amber-600 shrink-0" />
          <span>{{ SUPER_ADMIN: 'Owner', STORE_MANAGER: 'Store manager', CASHIER: 'Cashier' }[role] || role}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, user) => (
        user.isActive !== false ? (
          <span className="inline-flex items-center space-x-1.5 text-emerald-600 text-[11px] font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Active</span>
          </span>
        ) : (
          <span className="inline-flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span>Inactive</span>
          </span>
        )
      ),
    },
    {
      key: 'createdAt',
      header: 'Added on',
      accessor: 'createdAt',
      sortable: true,
      className: 'text-slate-500 font-light whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (val) => new Date(val).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, user) => (
        <div className="flex items-center justify-end space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => handleOpenEditModal(user)}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition cursor-pointer"
            title={`Edit ${user.name}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(user)}
            className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
            title={`Delete ${user.name}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-slate-900">Staff</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Who can sign in, and what they are allowed to do.</p>
        </div>

        <button
          id="add-staff-btn"
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition shadow-md flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">Add staff</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        serverSide={true}
        totalCount={totalUsers}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        searchValue={search}
        onSearchChange={handleSearchChange}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        searchPlaceholder="Instant search staff name, email, role..."
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        emptyIcon={Users}
        emptyMessage="No staff members found"
        emptySubtext="Use 'Add staff' to invite cashiers and store managers."
        initialSort={{ key: 'name', direction: 'asc' }}
        toolbarRight={
          <button
            type="button"
            onClick={fetchUsers}
            title="Refresh staff"
            className="p-1.5 sm:p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 shadow-2xs transition cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        }
      />

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl text-slate-900 my-auto max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                  {editingUser ? <Edit3 className="w-4 h-4 text-amber-600" /> : <UserPlus className="w-4 h-4 text-amber-600" />}
                </div>
                <div>
                  <span className="text-[11px] text-amber-700 font-semibold block">Credential</span>
                  <h3 className="text-base font-serif text-slate-900">
                    {editingUser ? 'Edit staff member' : 'Add staff member'}
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

            <form noValidate onSubmit={handleSubmitUser} className="mt-4 space-y-3.5">
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
                  {editingUser ? 'Password (leave blank to keep current)' : 'Temporary Password'} {!editingUser && <span className="text-rose-600">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder={editingUser ? '•••••••• (unchanged)' : '••••••••'}
                    className={`w-full pl-3 pr-9 py-2 rounded-md text-xs text-slate-900 focus:outline-none transition shadow-sm border ${
                      formErrors.password
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
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

              {editingUser && (
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 focus:outline-none cursor-pointer shadow-sm"
                  >
                    <option value="true" className="bg-white text-slate-900">Active (Can sign in)</option>
                    <option value="false" className="bg-white text-slate-900">Inactive (Account disabled)</option>
                  </select>
                </div>
              )}

              <div className="pt-3.5 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : editingUser ? 'Save Changes' : 'Grant Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 my-auto">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  Remove Staff Member
                </h3>
                <p className="text-xs text-slate-500">Revoke access from system</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-slate-900">{userToDelete.name}</span> (<span className="text-slate-700 font-mono">{userToDelete.email}</span>)?
            </p>

            {deleteError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                  setDeleteError('');
                }}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
              >
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{deleting ? 'Removing...' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
