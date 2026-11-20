import React from 'react';
import { 
  LayoutDashboard,
  Sparkles, 
  FolderTree, 
  Building2, 
  Users, 
  ShieldCheck, 
  Store, 
  LogOut, 
  User, 
  KeyRound, 
  Receipt,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { hasPermission } from '../../utils/permissions';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Owner',
  STORE_MANAGER: 'Manager',
  CASHIER: 'Cashier',
};

export const ADMIN_MASTERS_LIST = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    shortLabel: 'Dashboard',
    desc: 'Revenue, trends & inventory KPIs',
    icon: LayoutDashboard,
    requiredPermission: 'dashboard:view',
  },
  { 
    id: 'products', 
    label: 'Products Master', 
    shortLabel: 'Products',
    desc: 'Catalog, SKUs, barcode & stock',
    icon: Sparkles,
    requiredPermission: 'products:view',
  },
  { 
    id: 'categories', 
    label: 'Category Master', 
    shortLabel: 'Categories',
    desc: 'Scent families & taxonomy',
    icon: FolderTree,
    requiredPermission: 'categories:view',
  },
  { 
    id: 'outlets', 
    label: 'Outlet & Store Master', 
    shortLabel: 'Outlets',
    desc: 'Boutiques, cities & GSTIN',
    icon: Building2,
    requiredPermission: 'stores:view',
  },
  { 
    id: 'users', 
    label: 'Users Master', 
    shortLabel: 'Users',
    desc: 'Staff accounts & credentials',
    icon: Users,
    requiredPermission: 'users:view',
  },
  { 
    id: 'roles', 
    label: 'Roles & Permissions', 
    shortLabel: 'Roles',
    desc: 'Security matrix & CRUD',
    icon: ShieldCheck,
    requiredPermission: 'roles:view',
  },
];

export const hasMasterAccess = (user, master) => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (master.id === 'dashboard') {
    return hasPermission(user, 'dashboard:view');
  }
  if (master.id === 'categories') {
    return hasPermission(user, 'categories:view') || hasPermission(user, 'categories:manage');
  }
  if (master.id === 'outlets') {
    return hasPermission(user, 'stores:view') || hasPermission(user, 'stores:manage');
  }
  if (master.id === 'products') {
    return hasPermission(user, 'products:view') || hasPermission(user, 'products:create');
  }
  if (master.id === 'users') {
    return hasPermission(user, 'users:view') || hasPermission(user, 'users:manage');
  }
  if (master.id === 'roles') {
    return hasPermission(user, 'roles:view') || hasPermission(user, 'roles:manage');
  }
  return !master.requiredPermission || hasPermission(user, master.requiredPermission);
};

export default function AdminSidebar({
  isOpen = true,
  onToggle,
  activeMaster = 'products',
  onSelectMaster,
  currentUser,
  onLogout,
  stores = [],
  selectedStore,
  onSelectStore,
  onOpenChangePassword,
}) {
  const handleMasterClick = (masterId) => {
    if (onSelectMaster) onSelectMaster(masterId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && onToggle) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay (< lg) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar: Off-canvas drawer on mobile (< lg), collapsible inline sidebar on desktop (>= lg) */}
      <aside
        className={`h-full bg-white border-r border-slate-200 text-slate-800 flex flex-col justify-between shrink-0 select-none overflow-hidden transition-all duration-300 z-50 fixed inset-y-0 left-0 lg:static lg:z-30 ${
          isOpen
            ? 'w-72 max-w-[85vw] translate-x-0 shadow-2xl lg:shadow-none lg:w-64 xl:w-72'
            : '-translate-x-full lg:translate-x-0 lg:w-20'
        }`}
      >
        {/* 1. Sidebar Top Header: Brand Identity & Toggle / Close Button */}
        <div className="h-14 px-3 sm:px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          {isOpen ? (
            <div className="flex items-center justify-between w-full min-w-0">
              <Link
                to="/admin"
                className="flex items-center gap-2 min-w-0 hover:opacity-90 transition"
                title="JI Perfume - Admin Portal"
              >
                <img
                  src="/logo_transparent.png"
                  alt="JI Perfume"
                  className="h-7 w-auto object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fb = e.currentTarget.nextElementSibling;
                    if (fb) fb.classList.remove('hidden');
                  }}
                />
              </Link>

              {/* Close Button on Mobile Drawer */}
              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition lg:hidden cursor-pointer"
                aria-label="Close navigation"
                title="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="mx-auto">
              <Link to="/admin" title="JI Perfume Admin">
                <img
                  src="/logo_transparent.png"
                  alt="JI Perfume"
                  className="h-7 w-auto object-contain"
                />
              </Link>
            </div>
          )}
        </div>

        {/* 2. Sidebar Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-3 no-scrollbar">
          {/* Section: 6 Masters */}
          <div>
            {isOpen && (
              <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Admin Masters</span>
                <span className="text-amber-600 font-mono text-xs">
                  {ADMIN_MASTERS_LIST.filter(m => hasMasterAccess(currentUser, m)).length} / 6 Masters
                </span>
              </div>
            )}

            <nav className="space-y-1">
              {ADMIN_MASTERS_LIST.map((master) => {
                const isActive = activeMaster === master.id;
                const Icon = master.icon;
                const hasAccess = hasMasterAccess(currentUser, master);

                return (
                  <button
                    key={master.id}
                    id={`sidebar-master-${master.id}`}
                    onClick={() => handleMasterClick(master.id)}
                    className={`w-full rounded-xl transition-all cursor-pointer flex items-center gap-3 ${
                      isOpen 
                        ? 'px-3 py-2.5 text-left' 
                        : 'p-2.5 justify-center'
                    } ${
                      isActive
                        ? 'bg-amber-500 text-white font-semibold shadow-sm'
                        : hasAccess
                          ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 opacity-60'
                    }`}
                    title={`${master.label} - ${hasAccess ? master.desc : `Permission required: ${master.requiredPermission}`}`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : hasAccess ? 'text-amber-600' : 'text-slate-400'}`} />

                    {isOpen && (
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold leading-snug truncate flex items-center justify-between">
                          <span>{master.label}</span>
                          {!hasAccess && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />}
                        </div>
                        <div className={`text-xs leading-normal truncate mt-0.5 ${isActive ? 'text-white/85' : 'text-slate-400'}`}>
                          {hasAccess ? master.desc : 'Access restricted'}
                        </div>
                      </div>
                    )}

                    {isOpen && isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        {/* 3. Sidebar Bottom User Profile & Sign Out Footer */}
        {currentUser && (
          <div className="p-2 sm:p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
            {isOpen ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {currentUser.name}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 uppercase leading-none">
                        {ROLE_LABELS[currentUser.role] || currentUser.role}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenChangePassword}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                    title="Change Password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-amber-200 transition"
                  title={`${currentUser.name} - Change Password`}
                >
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
