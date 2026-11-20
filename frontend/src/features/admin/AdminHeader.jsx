import React from 'react';
import { 
  LayoutDashboard,
  Menu, 
  PanelLeft,
  PanelLeftClose, 
  PanelLeftOpen, 
  Store, 
  Receipt, 
  ArrowRight, 
  User, 
  LogOut,
  Sparkles,
  FolderTree,
  Building2,
  Users,
  ShieldCheck,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Owner',
  STORE_MANAGER: 'Manager',
  CASHIER: 'Cashier',
};

const MASTER_MAP = {
  dashboard: { label: 'Executive Dashboard', icon: LayoutDashboard },
  products: { label: 'Products Master', icon: Sparkles },
  categories: { label: 'Category Master', icon: FolderTree },
  outlets: { label: 'Outlet & Store Master', icon: Building2 },
  users: { label: 'Users Master', icon: Users },
  roles: { label: 'Roles & Permissions', icon: ShieldCheck },
};

export default function AdminHeader({
  isSidebarOpen = true,
  onToggleSidebar,
  activeMaster = 'products',
  currentUser,
  onLogout,
  stores = [],
  selectedStore,
  onSelectStore,
  onOpenChangePassword,
}) {
  const currentMaster = MASTER_MAP[activeMaster] || MASTER_MAP.products;
  const MasterIcon = currentMaster.icon;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-14 px-3 sm:px-6 flex items-center justify-between no-print shadow-2xs shrink-0 min-w-0">
      {/* Left: Sidebar Toggle Button & Active Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Responsive Sidebar Toggle Button: Menu/X on mobile, PanelLeft on desktop */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center justify-center shadow-2xs shrink-0"
          title={isSidebarOpen ? 'Close Navigation' : 'Open Navigation'}
          aria-label={isSidebarOpen ? 'Close Navigation' : 'Open Navigation'}
        >
          {/* Mobile icon (< lg) */}
          <span className="lg:hidden flex items-center justify-center">
            {isSidebarOpen ? (
              <X className="w-4 h-4 text-slate-800" />
            ) : (
              <Menu className="w-4 h-4 text-slate-800" />
            )}
          </span>
          {/* Desktop icon (>= lg) */}
          <span className="hidden lg:inline-flex items-center justify-center">
            {isSidebarOpen ? (
              <PanelLeftClose className="w-4 h-4 text-slate-800" />
            ) : (
              <PanelLeftOpen className="w-4 h-4 text-slate-800" />
            )}
          </span>
        </button>

        {/* Active Master Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium min-w-0">
          <span className="hidden sm:inline text-slate-400">Admin</span>
          <span className="hidden sm:inline text-slate-300">/</span>
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 bg-amber-50 text-amber-900 border border-amber-200/80 px-2 sm:px-2.5 py-1 rounded-lg min-w-0">
            <MasterIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-none">{currentMaster.label}</span>
          </span>
        </div>
      </div>

      {/* Right: POS Counter Shortcut, User Profile & Sign Out */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs shrink-0">
        {/* User Profile */}
        {currentUser && (
          <button
            type="button"
            onClick={onOpenChangePassword}
            title="Change Password"
            className="flex items-center gap-2 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 px-2 sm:px-2.5 py-1 rounded-xl transition cursor-pointer shadow-2xs shrink-0"
          >
            <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-semibold text-xs text-slate-900 truncate max-w-[6.5rem]">
                {currentUser.name}
              </span>
              <span className="text-[9px] text-slate-500 uppercase font-mono leading-none">
                {ROLE_LABELS[currentUser.role] || currentUser.role}
              </span>
            </div>
          </button>
        )}

        {/* Sign Out */}
        <button
          onClick={onLogout}
          title="Sign out of Admin Portal"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}

