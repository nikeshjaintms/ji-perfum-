import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  FileText, 
  Store, 
  LogOut, 
  User, 
  KeyRound, 
  ShieldCheck,
  ArrowRight,
  FolderTree,
  Building2,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { hasPermission } from '../utils/permissions';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Owner',
  STORE_MANAGER: 'Manager',
  CASHIER: 'Cashier',
};

export default function Navbar({
  activeTab = 'pos',
  setActiveTab,
  currentUser,
  onLogout,
  stores = [],
  selectedStore,
  onSelectStore,
  onOpenChangePassword,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const canViewBilling = hasPermission(currentUser, 'billing:create');
  const canViewInvoices = hasPermission(currentUser, 'invoices:view');
  const canViewCategories = hasPermission(currentUser, 'categories:view') || hasPermission(currentUser, 'categories:manage');
  const canViewStores = hasPermission(currentUser, 'stores:view') || hasPermission(currentUser, 'stores:manage');
  const canViewProducts = hasPermission(currentUser, 'products:view') || hasPermission(currentUser, 'products:create');

  // Only owners and store managers (or users granted dashboard access) have administrative privileges to access Admin Portal
  const canAccessAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'STORE_MANAGER' || hasPermission(currentUser, 'dashboard:view');

  const currentTab = location.pathname.startsWith('/invoices') 
    ? 'invoices' 
    : location.pathname.startsWith('/categories') 
    ? 'categories'
    : location.pathname.startsWith('/outlets')
    ? 'outlets'
    : location.pathname.startsWith('/products')
    ? 'products'
    : 'billing';

  // In User Section, dynamically display tabs for every permitted module under clean user URLs
  const navItems = [
    canViewBilling && { id: 'billing', label: 'Billing', fullLabel: 'Billing (POS)', icon: Receipt, path: '/billing' },
    canViewInvoices && { id: 'invoices', label: 'Invoices', fullLabel: 'Invoices', icon: FileText, path: '/invoices' },
    canViewCategories && { id: 'categories', label: 'Categories', fullLabel: 'Categories', icon: FolderTree, path: '/categories' },
    canViewStores && { id: 'outlets', label: 'Outlets', fullLabel: 'Outlets', icon: Building2, path: '/outlets' },
    canViewProducts && { id: 'products', label: 'Products', fullLabel: 'Products', icon: Sparkles, path: '/products' },
  ].filter(Boolean);

  const handleNavClick = (item) => {
    if (setActiveTab) setActiveTab(item.id);
    navigate(item.path);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        <div className="max-w-[1700px] mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-2 sm:gap-3">
            
            {/* Left: Mobile Menu Button (< md), Brand Logo & Navigation Tabs (>= md) */}
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 h-full min-w-0 flex-1 overflow-hidden">
              {/* Mobile hamburger toggle button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-1.5 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer shrink-0"
                title="Open navigation menu"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5 text-slate-800" />
              </button>

              {/* Brand Logo */}
              <Link
                to="/billing"
                className="shrink-0 cursor-pointer flex items-center pr-1"
                title="JI Perfume ERP - Point of Sale"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img
                  src="/logo_transparent.png"
                  alt="JI Perfume"
                  className="h-6 sm:h-7 w-auto object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fb = e.currentTarget.nextElementSibling;
                    if (fb) fb.classList.remove('hidden');
                  }}
                />
                <span className="hidden font-serif text-sm font-bold text-slate-900 tracking-tight">
                  JI <span className="text-amber-600 font-light">PERFUME</span>
                </span>
              </Link>

              {/* Direct Navigation Links: Visible on Tablet and Desktop (>= md) */}
              <nav className="hidden md:flex items-stretch gap-1 sm:gap-1.5 md:gap-2 h-full overflow-x-auto no-scrollbar scroll-smooth min-w-0 flex-1" aria-label="POS Counter">
                {navItems.map((item) => {
                  const isActive = currentTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`nav-tab-${item.id}`}
                      onClick={() => handleNavClick(item)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`text-xs sm:text-sm border-b-2 -mb-px px-2 sm:px-2.5 lg:px-3 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'border-amber-500 text-slate-900 font-bold bg-amber-50/50'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-400'} shrink-0`} />
                      <span className="hidden lg:inline">{item.fullLabel || item.label}</span>
                      <span className="inline lg:hidden">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Right: Switch to Admin (if authorized), Store Selector, User Profile & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 text-xs sm:text-sm shrink-0">
              {/* If user is Super Admin or Store Manager, show Admin Portal shortcut */}
              {canAccessAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold rounded-lg text-xs transition shadow-sm whitespace-nowrap shrink-0"
                  title="Open Admin Portal"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Admin Portal</span>
                  <ArrowRight className="w-3 h-3 hidden lg:inline" />
                </Link>
              )}

              {/* User Profile / Change Password */}
              {currentUser && (
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  title={`${currentUser.name || 'User'} (${ROLE_LABELS[currentUser.role] || currentUser.role}) - Change Password`}
                  className="group flex items-center gap-1.5 lg:gap-2 shrink-0 bg-slate-50/80 hover:bg-amber-50/80 border border-slate-200/90 hover:border-amber-200 px-1.5 py-1 sm:px-2 lg:px-2.5 rounded-xl transition-all cursor-pointer text-left shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-full bg-amber-100/80 group-hover:bg-amber-200/80 border border-amber-300/80 flex items-center justify-center text-amber-800 shrink-0 transition-colors font-bold text-xs">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="hidden lg:flex flex-col min-w-0 text-left justify-center">
                    <div className="flex items-center gap-1 leading-tight">
                      <span className="font-medium text-slate-900 group-hover:text-amber-900 truncate max-w-[5.5rem] md:max-w-[7.5rem] text-xs transition-colors">
                        {currentUser.name}
                      </span>
                      <KeyRound className="w-3 h-3 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0" />
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium leading-tight mt-0.5">
                      {ROLE_LABELS[currentUser.role] || currentUser.role}
                    </span>
                  </div>
                </button>
              )}

              {/* Sign Out */}
              <button
                onClick={onLogout}
                title="Sign out of counter"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1.5 lg:px-2.5 rounded-xl border border-transparent hover:border-rose-200 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Backdrop Overlay (< md) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Off-canvas Navigation Drawer (< md) */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 md:hidden flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header & Links */}
        <div className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/logo_transparent.png"
                alt="JI Perfume"
                className="h-6 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.nextElementSibling;
                  if (fb) fb.classList.remove('hidden');
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Store Badge */}
          {selectedStore?.name && (
            <div className="px-3 pt-3">
              <div className="px-3 py-2 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-center gap-2 text-xs text-amber-950 font-medium">
                <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{selectedStore.name}</span>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="p-3 space-y-1">
            <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              Counter Navigation
            </p>
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNavClick(item);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200/80 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'} shrink-0`} />
                  <span className="flex-1 text-left">{item.fullLabel || item.label}</span>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                </button>
              );
            })}

            {/* Admin Portal Shortcut in drawer */}
            {canAccessAdmin && (
              <div className="pt-3 mt-3 border-t border-slate-100">
                <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Administration
                </p>
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-amber-400 shadow-sm transition"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span className="flex-1 text-left">Admin Portal</span>
                  <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer: User Profile & Actions */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
          {currentUser && (
            <div className="flex items-center gap-2.5 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 font-bold text-xs shrink-0">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm truncate">{currentUser.name}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  {ROLE_LABELS[currentUser.role] || currentUser.role}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenChangePassword) onOpenChangePassword();
                }}
                className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>Password</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                if (onLogout) onLogout();
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
