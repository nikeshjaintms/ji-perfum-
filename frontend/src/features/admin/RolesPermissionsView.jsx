import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  Key, 
  Check, 
  X, 
  Search, 
  Filter, 
  RefreshCw, 
  Layers, 
  Lock, 
  Sparkles,
  Info,
  ChevronDown,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  Save,
  CheckSquare,
  Square
} from 'lucide-react';
import { userService } from '../../services/api';
import { hasPermission } from '../../utils/permissions';

const ROLE_COLOR_OPTIONS = [
  { value: 'amber', label: 'Gold Amber', badge: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  { value: 'blue', label: 'Sapphire Blue', badge: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  { value: 'emerald', label: 'Emerald Green', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  { value: 'purple', label: 'Royal Purple', badge: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  { value: 'rose', label: 'Rose Red', badge: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' },
  { value: 'slate', label: 'Slate Gray', badge: 'bg-slate-100 text-slate-800 border-slate-300', dot: 'bg-slate-500' },
];

const ROLE_COLOR_STYLES = {
  amber: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    indicator: 'bg-amber-500',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    indicator: 'bg-blue-500',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    indicator: 'bg-emerald-500',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    indicator: 'bg-purple-500',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    indicator: 'bg-rose-500',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    indicator: 'bg-slate-500',
  },
};

export default function RolesPermissionsView({ onNavigateToUsers = null, currentUser = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [activeRoleInspector, setActiveRoleInspector] = useState('SUPER_ADMIN');

  // Interactive toggle indicator state: { [`${roleId}-${permKey}`]: boolean }
  const [togglingKeys, setTogglingKeys] = useState({});
  const [toastMsg, setToastMsg] = useState(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Form State (Roles)
  const [selectedRoleForAction, setSelectedRoleForAction] = useState(null);
  const [formData, setFormData] = useState({
    roleId: '',
    name: '',
    description: '',
    badgeColor: 'amber',
    permissions: [],
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Permission CRUD States
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isDeletePermModalOpen, setIsDeletePermModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState(null);
  const [permToDelete, setPermToDelete] = useState(null);
  const [permFormData, setPermFormData] = useState({
    key: '',
    name: '',
    description: '',
    moduleId: 'billing',
    moduleName: 'POS & Billing',
    grantToAdmin: true,
  });
  const [permFormSubmitting, setPermFormSubmitting] = useState(false);
  const [permFormError, setPermFormError] = useState('');
  const [isNewModule, setIsNewModule] = useState(false);
  const [newModuleName, setNewModuleName] = useState('');

  const showToast = (message, type = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchRolesData = async () => {
    if (currentUser && !hasPermission(currentUser, 'roles:view')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await userService.getRolesAndPermissions();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Failed to load roles and permissions');
      }
    } catch (err) {
      console.error('Error loading roles data:', err);
      setError(err?.response?.data?.message || 'Network or server error loading permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  const roles = data?.roles || [];
  const modules = data?.modules || [];
  const summary = data?.summary || {
    totalRoles: 0,
    totalModules: 0,
    totalPermissions: 0,
    totalUsers: 0,
  };

  // Filter modules and permissions based on user query & selected module
  const filteredModules = useMemo(() => {
    if (!modules.length) return [];
    
    return modules
      .filter((mod) => selectedModule === 'ALL' || mod.id === selectedModule)
      .map((mod) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return mod;

        const modNameMatches = mod.name.toLowerCase().includes(query);
        const filteredPerms = mod.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.key.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query)
        );

        if (modNameMatches) {
          return mod;
        }

        if (filteredPerms.length > 0) {
          return { ...mod, permissions: filteredPerms };
        }

        return null;
      })
      .filter(Boolean);
  }, [modules, selectedModule, searchQuery]);

  const activeRoleObj = useMemo(() => {
    return roles.find((r) => r.id === activeRoleInspector) || roles[0];
  }, [roles, activeRoleInspector]);

  // Fast 1-Click Interactive Permission Toggle directly from Matrix Table
  const handleToggleMatrixCell = async (roleId, permKey) => {
    if (roleId === 'SUPER_ADMIN' && permKey === 'roles:manage') {
      showToast('Cannot revoke roles:manage from Owner (SUPER_ADMIN)', 'error');
      return;
    }

    const toggleId = `${roleId}-${permKey}`;
    setTogglingKeys((prev) => ({ ...prev, [toggleId]: true }));

    try {
      const res = await userService.togglePermission(roleId, permKey);
      if (res.success) {
        // Update state locally for instantaneous zero-latency UX
        setData((prev) => {
          if (!prev) return prev;
          const updatedRoles = prev.roles.map((r) => {
            if (r.id === roleId) {
              return { ...r, permissions: res.data.permissions };
            }
            return r;
          });
          return { ...prev, roles: updatedRoles };
        });
        showToast(`${res.data.granted ? 'Granted' : 'Revoked'} "${permKey}" for ${roleId}`);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to toggle permission', 'error');
    } finally {
      setTogglingKeys((prev) => {
        const next = { ...prev };
        delete next[toggleId];
        return next;
      });
    }
  };

  // Open Create Role Modal
  const openCreateModal = () => {
    setFormData({
      roleId: '',
      name: '',
      description: '',
      badgeColor: 'amber',
      permissions: ['invoices:view', 'products:view'],
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Role Modal
  const openEditModal = (role) => {
    setSelectedRoleForAction(role);
    setFormData({
      roleId: role.id,
      name: role.name,
      description: role.description || '',
      badgeColor: role.badgeColor || 'amber',
      permissions: [...role.permissions],
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open Delete Role Modal
  const openDeleteModal = (role) => {
    setSelectedRoleForAction(role);
    setIsDeleteModalOpen(true);
  };

  // Open Reset Role Modal
  const openResetModal = (role) => {
    setSelectedRoleForAction(role);
    setIsResetModalOpen(true);
  };

  // Handle Form Submit: Create Role
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Role name is required');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const res = await userService.createRole(formData);
      if (res.success) {
        showToast(`Role "${res.data.name}" created successfully`);
        setIsCreateModalOpen(false);
        await fetchRolesData();
      }
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to create role');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Form Submit: Edit Role
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Role name is required');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const res = await userService.updateRole(selectedRoleForAction.id, formData);
      if (res.success) {
        showToast(`Role "${res.data.name}" updated successfully`);
        setIsEditModalOpen(false);
        await fetchRolesData();
      }
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to update role');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!selectedRoleForAction) return;
    setFormSubmitting(true);
    try {
      const res = await userService.deleteRole(selectedRoleForAction.id);
      if (res.success) {
        showToast(`Role deleted successfully`);
        setIsDeleteModalOpen(false);
        if (activeRoleInspector === selectedRoleForAction.id) {
          setActiveRoleInspector('SUPER_ADMIN');
        }
        await fetchRolesData();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to delete role', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Confirm Reset
  const handleConfirmReset = async () => {
    if (!selectedRoleForAction) return;
    setFormSubmitting(true);
    try {
      const res = await userService.resetRole(selectedRoleForAction.id);
      if (res.success) {
        showToast(`Role permissions reset to defaults`);
        setIsResetModalOpen(false);
        await fetchRolesData();
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to reset role', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ============================================================
  // Permission CRUD Handlers
  // ============================================================
  const handleOpenCreatePermission = (defaultModuleId = null) => {
    setEditingPerm(null);
    setIsNewModule(false);
    setNewModuleName('');
    const targetModule = modules.find((m) => m.id === defaultModuleId) || modules[0];
    setPermFormData({
      key: targetModule ? `${targetModule.id}:` : '',
      name: '',
      description: '',
      moduleId: targetModule ? targetModule.id : 'billing',
      moduleName: targetModule ? targetModule.name : 'POS & Billing',
      grantToAdmin: true,
    });
    setPermFormError('');
    setIsPermModalOpen(true);
  };

  const handleOpenEditPermission = (perm, mod) => {
    setEditingPerm(perm);
    setIsNewModule(false);
    setNewModuleName('');
    setPermFormData({
      key: perm.key,
      name: perm.name,
      description: perm.description || '',
      moduleId: mod?.id || perm.moduleId || 'billing',
      moduleName: mod?.name || perm.moduleName || 'POS & Billing',
      grantToAdmin: true,
    });
    setPermFormError('');
    setIsPermModalOpen(true);
  };

  const handleOpenDeletePermission = (perm) => {
    setPermToDelete(perm);
    setPermFormError('');
    setIsDeletePermModalOpen(true);
  };

  const handleSavePermission = async (e) => {
    e.preventDefault();
    if (!permFormData.name.trim()) {
      setPermFormError('Permission name is required');
      return;
    }

    let finalModuleId = permFormData.moduleId;
    let finalModuleName = permFormData.moduleName;

    if (isNewModule) {
      if (!newModuleName.trim()) {
        setPermFormError('New module name is required');
        return;
      }
      finalModuleName = newModuleName.trim();
      finalModuleId = finalModuleName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    try {
      setPermFormSubmitting(true);
      setPermFormError('');

      if (editingPerm) {
        await userService.updatePermission(editingPerm.id || editingPerm.key, {
          name: permFormData.name.trim(),
          description: permFormData.description.trim(),
          moduleId: finalModuleId,
          moduleName: finalModuleName,
        });
        showToast(`Permission "${permFormData.name}" updated successfully`);
      } else {
        if (!permFormData.key.trim()) {
          setPermFormError('Permission key is required (e.g. module:action)');
          setPermFormSubmitting(false);
          return;
        }
        await userService.createPermission({
          key: permFormData.key.trim().toLowerCase(),
          name: permFormData.name.trim(),
          description: permFormData.description.trim(),
          moduleId: finalModuleId,
          moduleName: finalModuleName,
          grantToAdmin: permFormData.grantToAdmin,
        });
        showToast(`Permission "${permFormData.name}" created successfully`);
      }

      setIsPermModalOpen(false);
      setEditingPerm(null);
      await fetchRolesData();
    } catch (err) {
      setPermFormError(err.response?.data?.message || 'Failed to save permission');
    } finally {
      setPermFormSubmitting(false);
    }
  };

  const handleConfirmDeletePermission = async () => {
    if (!permToDelete) return;
    try {
      setPermFormSubmitting(true);
      setPermFormError('');
      await userService.deletePermission(permToDelete.id || permToDelete.key);
      showToast(`Permission "${permToDelete.name}" deleted successfully`);
      setIsDeletePermModalOpen(false);
      setPermToDelete(null);
      await fetchRolesData();
    } catch (err) {
      setPermFormError(err.response?.data?.message || 'Failed to delete permission');
    } finally {
      setPermFormSubmitting(false);
    }
  };

  // Toggle permission in modal form
  const toggleFormPermission = (permKey) => {
    setFormData((prev) => {
      const has = prev.permissions.includes(permKey);
      return {
        ...prev,
        permissions: has 
          ? prev.permissions.filter((k) => k !== permKey)
          : [...prev.permissions, permKey],
      };
    });
  };

  // Toggle all permissions for a module in modal form
  const toggleModuleInForm = (mod) => {
    const modKeys = mod.permissions.map((p) => p.key);
    const allSelected = modKeys.every((k) => formData.permissions.includes(k));

    setFormData((prev) => {
      let nextPerms;
      if (allSelected) {
        nextPerms = prev.permissions.filter((k) => !modKeys.includes(k));
      } else {
        const toAdd = modKeys.filter((k) => !prev.permissions.includes(k));
        nextPerms = [...prev.permissions, ...toAdd];
      }
      return { ...prev, permissions: nextPerms };
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
          toastMsg.type === 'error'
            ? 'bg-rose-900 text-rose-100 border-rose-700'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          {toastMsg.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toastMsg.message}</span>
        </div>
      )}

      {/* Top Header & Master Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shadow-sm border border-amber-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Roles & Permissions Master
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal border border-slate-200 font-mono">
                  Full CRUD Enabled
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Create custom roles, edit role policies, and click any permission in the matrix to instantly grant or revoke capabilities
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Add Permission, Add Role, Manage Users, Refresh */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleOpenCreatePermission()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm cursor-pointer"
            title="Create new system capability permission"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Permission</span>
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Role</span>
          </button>

          {onNavigateToUsers && (
            <button
              onClick={onNavigateToUsers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Staff Users</span>
            </button>
          )}

          <button
            onClick={fetchRolesData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm disabled:opacity-50 cursor-pointer"
            title="Reload data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Configured Roles</div>
            <div className="text-xl font-bold text-slate-900">{summary.totalRoles || 4}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Granular Permissions</div>
            <div className="text-xl font-bold text-slate-900">{summary.totalPermissions || 20}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Protected Modules</div>
            <div className="text-xl font-bold text-slate-900">{summary.totalModules || 7}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Assigned Staff</div>
            <div className="text-xl font-bold text-slate-900">{summary.totalUsers || 0}</div>
          </div>
        </div>
      </div>

      {/* Role Cards Grid with Quick Action Controls (Edit, Reset, Delete) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            Roles Catalog ({roles.length})
          </h3>
          <span className="text-xs text-slate-400">Click a card to inspect profile or use action icons to edit</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {roles.map((role) => {
            const styles = ROLE_COLOR_STYLES[role.badgeColor] || ROLE_COLOR_STYLES.slate;
            const isSelected = activeRoleInspector === role.id;
            const permPct = summary.totalPermissions > 0 
              ? Math.round((role.permissions.length / summary.totalPermissions) * 100) 
              : 0;

            return (
              <div
                key={role.id}
                onClick={() => setActiveRoleInspector(role.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative bg-white flex flex-col justify-between ${
                  isSelected 
                    ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20' 
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${styles.badge}`}>
                      {role.id}
                    </span>
                    
                    {/* Role Card Action Controls */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(role)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit Role & Permissions"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {role.isSystem ? (
                        <button
                          type="button"
                          onClick={() => openResetModal(role)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                          title="Reset Permissions to Default"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(role)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mb-1">{role.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 min-h-[32px]">
                    {role.description || 'Custom security role policy'}
                  </p>
                </div>

                {/* Progress bar of permissions & User Count */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                    <span className="flex items-center gap-1 text-slate-600 font-medium">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{role.userCount} {role.userCount === 1 ? 'user' : 'users'}</span>
                    </span>
                    <span className="font-semibold text-slate-700">
                      {role.permissions.length} / {summary.totalPermissions} ({permPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${styles.indicator}`} 
                      style={{ width: `${permPct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Permissions Matrix Section (Interactive Click-to-Toggle) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Module & Capability Access Matrix</h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full border border-emerald-200">
                  Interactive Toggle
                </span>
              </div>
              <p className="text-xs text-slate-500">Click any checkmark or cross to immediately grant or revoke permissions</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search permission or key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Module Filter Dropdown */}
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Modules ({modules.length})</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-7 h-7 text-amber-600 animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Loading permissions registry…</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <button
              onClick={fetchRolesData}
              className="mt-3 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Retry Loading
            </button>
          </div>
        )}

        {/* Matrix Table with 1-Click Interactive Cell Toggle */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 text-xs font-semibold">
                  <th className="py-3 px-4 w-[35%] min-w-[280px]">Module & Granular Permission</th>
                  {roles.map((role) => {
                    const isSelected = activeRoleInspector === role.id;
                    return (
                      <th 
                        key={role.id} 
                        className={`py-3 px-4 text-center font-bold min-w-[120px] transition-colors ${
                          isSelected ? 'bg-amber-50/80 text-amber-900 border-x border-amber-200' : ''
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="truncate max-w-[130px]">{role.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {role.id}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan={1 + roles.length} className="py-12 text-center text-slate-400">
                      No permissions match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((mod) => (
                    <React.Fragment key={mod.id}>
                      {/* Module Header Row */}
                      <tr className="bg-slate-50/90 font-semibold text-slate-800 border-t border-b border-slate-200">
                        <td colSpan={1 + roles.length} className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-slate-900 font-bold">{mod.name}</span>
                            <span className="text-[11px] font-normal text-slate-500">
                              — {mod.description}
                            </span>
                            <div className="ml-auto flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenCreatePermission(mod.id)}
                                className="inline-flex items-center gap-1 text-[11px] bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer shadow-2xs"
                                title={`Add permission to ${mod.name}`}
                              >
                                <Plus className="w-3 h-3 text-blue-600" />
                                <span>Add Perm</span>
                              </button>
                              <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                                {mod.permissions.length} perms
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Permissions Rows */}
                      {mod.permissions.map((perm) => (
                        <tr key={perm.key} className="hover:bg-slate-50/70 transition-colors group">
                          <td className="py-2.5 px-4 pl-8">
                            <div className="font-medium text-slate-900 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="truncate">{perm.name}</span>
                                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                  {perm.key}
                                </span>
                                {perm.isSystem && (
                                  <span className="text-[9px] font-medium bg-slate-100 text-slate-400 px-1 py-0.2 rounded border border-slate-200 shrink-0">
                                    system
                                  </span>
                                )}
                              </div>

                              {/* Permission Row Actions: Edit, Delete */}
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPermission(perm, mod)}
                                  className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                                  title={`Edit ${perm.name}`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeletePermission(perm)}
                                  className="p-1 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition cursor-pointer"
                                  title={`Delete ${perm.name}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {perm.description}
                            </div>
                          </td>

                          {/* Role Permission Cells (Clickable to Toggle) */}
                          {roles.map((role) => {
                            const isAllowed = role.permissions.includes(perm.key);
                            const isSelectedRole = activeRoleInspector === role.id;
                            const toggleId = `${role.id}-${perm.key}`;
                            const isToggling = !!togglingKeys[toggleId];

                            return (
                              <td
                                key={`${role.id}-${perm.key}`}
                                className={`py-2 px-4 text-center ${
                                  isSelectedRole ? 'bg-amber-50/30 border-x border-amber-100' : ''
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleToggleMatrixCell(role.id, perm.key)}
                                  disabled={isToggling}
                                  title={`Click to ${isAllowed ? 'revoke' : 'grant'} "${perm.name}" for ${role.name}`}
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition transform active:scale-95 cursor-pointer ${
                                    isAllowed
                                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-400'
                                  }`}
                                >
                                  {isToggling ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                                  ) : isAllowed ? (
                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                  ) : (
                                    <X className="w-4 h-4 stroke-[2]" />
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Profile Inspector Card */}
      {activeRoleObj && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {activeRoleObj.name}
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700 border border-slate-200">
                    {activeRoleObj.id}
                  </span>
                </h4>
                <p className="text-xs text-slate-500">{activeRoleObj.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openEditModal(activeRoleObj)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Policy</span>
              </button>

              {activeRoleObj.isSystem ? (
                <button
                  type="button"
                  onClick={() => openResetModal(activeRoleObj)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reset Defaults</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openDeleteModal(activeRoleObj)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Role</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>Granted Permission Capabilities ({activeRoleObj.permissions.length} allowed):</span>
              <span className="text-slate-400 font-normal">
                {summary.totalPermissions - activeRoleObj.permissions.length} restricted
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {activeRoleObj.permissions.map((pk) => (
                <span
                  key={pk}
                  className="text-[11px] font-mono px-2 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  {pk}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE ROLE / ADD CUSTOM ROLE */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Add New ERP Role</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Code / ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INVENTORY_SUPERVISOR"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-400">Uppercase identifier with underscores</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inventory Supervisor"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline responsibilities and authorization scope..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Badge Theme Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_COLOR_OPTIONS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, badgeColor: col.value })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                        formData.badgeColor === col.value
                          ? `${col.badge} ring-2 ring-amber-500/30 font-bold`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span>{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Checklist Grouped by Module */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    Granted Permissions Checklist ({formData.permissions.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = modules.flatMap((m) => m.permissions.map((p) => p.key));
                        setFormData({ ...formData, permissions: allKeys });
                      }}
                      className="text-amber-700 hover:text-amber-900 font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: [] })}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {modules.map((mod) => {
                    const modKeys = mod.permissions.map((p) => p.key);
                    const selectedCount = modKeys.filter((k) => formData.permissions.includes(k)).length;
                    const allSelected = modKeys.length > 0 && selectedCount === modKeys.length;

                    return (
                      <div key={mod.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => toggleModuleInForm(mod)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-amber-800"
                          >
                            {allSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{mod.name}</span>
                          </button>
                          <span className="text-[10px] text-slate-500">
                            {selectedCount}/{modKeys.length} granted
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                          {mod.permissions.map((perm) => {
                            const isChecked = formData.permissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleFormPermission(perm.key)}
                                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                                />
                                <div className="leading-tight">
                                  <div>{perm.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{perm.key}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{formSubmitting ? 'Creating…' : 'Create Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT ROLE */}
      {/* ============================================================ */}
      {isEditModalOpen && selectedRoleForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Role Policy: {selectedRoleForAction.name} ({selectedRoleForAction.id})
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Code / ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value={formData.roleId}
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400">Primary role identifier is fixed</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Badge Theme Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_COLOR_OPTIONS.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, badgeColor: col.value })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                        formData.badgeColor === col.value
                          ? `${col.badge} ring-2 ring-amber-500/30 font-bold`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span>{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    Granted Permissions Checklist ({formData.permissions.length} selected)
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const allKeys = modules.flatMap((m) => m.permissions.map((p) => p.key));
                        setFormData({ ...formData, permissions: allKeys });
                      }}
                      className="text-amber-700 hover:text-amber-900 font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, permissions: [] })}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {modules.map((mod) => {
                    const modKeys = mod.permissions.map((p) => p.key);
                    const selectedCount = modKeys.filter((k) => formData.permissions.includes(k)).length;
                    const allSelected = modKeys.length > 0 && selectedCount === modKeys.length;

                    return (
                      <div key={mod.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => toggleModuleInForm(mod)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-amber-800"
                          >
                            {allSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{mod.name}</span>
                          </button>
                          <span className="text-[10px] text-slate-500">
                            {selectedCount}/{modKeys.length} granted
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                          {mod.permissions.map((perm) => {
                            const isChecked = formData.permissions.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                className={`flex items-start gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-medium'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleFormPermission(perm.key)}
                                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                                />
                                <div className="leading-tight">
                                  <div>{perm.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{perm.key}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{formSubmitting ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE CUSTOM ROLE */}
      {/* ============================================================ */}
      {isDeleteModalOpen && selectedRoleForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Custom Role?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to permanently delete <strong className="text-slate-800">{selectedRoleForAction.name} ({selectedRoleForAction.id})</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={formSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {formSubmitting ? 'Deleting…' : 'Yes, Delete Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE / EDIT PERMISSION */}
      {/* ============================================================ */}
      {isPermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingPerm ? 'Edit Permission' : 'Create New Permission'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingPerm ? 'Update permission metadata' : 'Define a new system capability across ERP modules'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPermModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePermission} className="p-4 sm:p-5 space-y-4">
              {permFormError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{permFormError}</span>
                </div>
              )}

              {/* Module Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Module / Domain <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={isNewModule ? '__NEW__' : permFormData.moduleId}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsNewModule(true);
                      } else {
                        setIsNewModule(false);
                        const selMod = modules.find((m) => m.id === e.target.value);
                        setPermFormData((prev) => ({
                          ...prev,
                          moduleId: e.target.value,
                          moduleName: selMod?.name || e.target.value,
                          // Autofill prefix if key is empty or has module prefix
                          key: editingPerm ? prev.key : (!prev.key || prev.key.includes(':') ? `${e.target.value}:${prev.key.split(':')[1] || ''}` : prev.key)
                        }));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white cursor-pointer"
                  >
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                    <option value="__NEW__">+ Create New Module...</option>
                  </select>

                  {isNewModule && (
                    <input
                      type="text"
                      placeholder="e.g. Reports & Analytics"
                      value={newModuleName}
                      onChange={(e) => setNewModuleName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Permission Key (Identifier) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Permission Key <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">format: module:action</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. billing:refund or reports:export"
                  value={permFormData.key}
                  disabled={!!editingPerm}
                  onChange={(e) => setPermFormData({ ...permFormData, key: e.target.value })}
                  className={`w-full px-3 py-2 text-xs border font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    editingPerm ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                  }`}
                />
                {editingPerm && (
                  <p className="text-[10px] text-slate-400 mt-1">Permission key cannot be changed after creation.</p>
                )}
              </div>

              {/* Permission Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Permission Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Export Financial Reports"
                  value={permFormData.name}
                  onChange={(e) => setPermFormData({ ...permFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe what this capability enables in the system..."
                  value={permFormData.description}
                  onChange={(e) => setPermFormData({ ...permFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Auto-grant to Super Admin (only for new) */}
              {!editingPerm && (
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permFormData.grantToAdmin}
                    onChange={(e) => setPermFormData({ ...permFormData, grantToAdmin: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Automatically grant this permission to <strong>Owner (Super Admin)</strong></span>
                </label>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPermModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={permFormSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {permFormSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{permFormSubmitting ? 'Saving…' : editingPerm ? 'Save Changes' : 'Create Permission'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE PERMISSION CONFIRMATION */}
      {/* ============================================================ */}
      {isDeletePermModalOpen && permToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Delete Permission?</h3>
            <p className="text-xs text-slate-600 mb-3">
              Are you sure you want to delete <strong className="text-slate-900">{permToDelete.name}</strong> (<span className="font-mono text-slate-700">{permToDelete.key}</span>)?
            </p>
            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-4 text-left">
              <strong>Notice:</strong> This capability will be removed from all configured roles and will no longer be available in the security access matrix.
            </p>
            {permFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {permFormError}
              </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeletePermModalOpen(false);
                  setPermToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePermission}
                disabled={permFormSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {permFormSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{permFormSubmitting ? 'Deleting…' : 'Yes, Delete Permission'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: RESET SYSTEM ROLE DEFAULTS */}
      {/* ============================================================ */}
      {isResetModalOpen && selectedRoleForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Reset to System Defaults?</h3>
            <p className="text-xs text-slate-500 mb-4">
              This will restore the factory permissions and profile settings for <strong className="text-slate-800">{selectedRoleForAction.name} ({selectedRoleForAction.id})</strong>.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={formSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition shadow-sm disabled:opacity-50"
              >
                {formSubmitting ? 'Resetting…' : 'Reset to Default'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
