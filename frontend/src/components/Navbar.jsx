import React, { useState } from 'react';
import { 
  Plus, 
  Receipt, 
  FileText, 
  Sparkles, 
  FolderTree, 
  Users, 
  Store, 
  Building2,
  LogOut, 
  User, 
  RefreshCw,
  KeyRound,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Owner',
  STORE_MANAGER: 'Manager',
  CASHIER: 'Cashier',
};

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onQuickSwitchRole,
  stores = [],
  selectedStore,
  onSelectStore,
  onOpenAddOutlet,
  onOpenChangePassword,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'pos', label: 'Billing', icon: Receipt },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'categories', label: 'Category Master', icon: FolderTree, adminOnly: true },
    { id: 'outlets', label: 'Outlet & City Master', icon: Building2, adminOnly: true },
    { id: 'products', label: 'Products', icon: Sparkles },
    { id: 'users', label: 'Users', icon: Users, adminOnly: true },
  ].filter((item) => !item.adminOnly || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'STORE_MANAGER');

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
          
          {/* Left: Brand Logo & Desktop Nav Links */}
          <div className="flex items-center gap-3 xl:gap-6 h-full min-w-0 flex-1 overflow-hidden">
            {/* Brand Logo */}
            <button
              onClick={() => handleTabClick('pos')}
              className="font-serif text-lg sm:text-xl font-semibold text-slate-900 self-center whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
              title="JI Perfume ERP - Point of Sale"
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
              <span className="hidden font-serif text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                JI <span className="text-amber-600 font-light">PERFUME</span>
              </span>
            </button>

            {/* Desktop Navigation Links (>= 1280px) */}
            <nav className="hidden xl:flex items-stretch gap-2.5 2xl:gap-5 h-full overflow-hidden" aria-label="Main">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`text-xs 2xl:text-sm border-b-2 -mb-px px-1.5 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'border-amber-500 text-slate-900 font-semibold'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-400'} shrink-0`} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Store Selector, User Profile & Logout & 3-Line Mobile Button */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm shrink-0 relative z-10">
            {/* Store / Outlet Selector (Desktop >= md) */}
            {stores && stores.length > 0 && (
              <div className="hidden md:flex items-center space-x-1.5 shrink min-w-0 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2.5 py-1 text-xs transition shadow-2xs">
                <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold leading-none">Outlet</span>
                  <select
                    value={selectedStore?.id || ''}
                    onChange={(e) => {
                      const found = stores.find((s) => s.id === e.target.value);
                      if (found) onSelectStore(found);
                    }}
                    aria-label="Select Counter or Outlet"
                    className="bg-transparent border-0 font-medium text-slate-900 focus:outline-none cursor-pointer text-xs truncate max-w-[130px] p-0 pr-1"
                  >
                    {stores.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.city?.name || 'Counter'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {currentUser && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                title="Change Password"
                className="group flex items-center gap-2 shrink-0 bg-slate-50/80 hover:bg-amber-50/80 border border-slate-200/90 hover:border-amber-200 px-2.5 py-1 rounded-xl transition-all cursor-pointer text-left shadow-2xs"
              >
                <div className="w-7 h-7 rounded-full bg-amber-100/80 group-hover:bg-amber-200/80 border border-amber-300/80 flex items-center justify-center text-amber-800 shrink-0 transition-colors font-bold text-xs">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                </div>
                <div className="hidden sm:flex flex-col min-w-0 text-left justify-center">
                  <div className="flex items-center gap-1 leading-tight">
                    <span className="font-medium text-slate-900 group-hover:text-amber-900 truncate max-w-[5.5rem] md:max-w-[8.5rem] text-xs transition-colors">
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

            <button
              onClick={onLogout}
              title="Sign out of counter"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-transparent hover:border-rose-200 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Sign out</span>
            </button>

            {/* 3-Line Hamburger Menu Button on the Right Side (< 1280px) */}
            <button
              type="button"
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
              className="xl:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-900" />
              ) : (
                <Menu className="w-5 h-5 text-slate-900" />
              )}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Slide-down Navigation Menu (< 1280px, Toggled by 3-line button) */}
        {/* ============================================================== */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 top-14 bg-slate-950/40 backdrop-blur-xs z-30 xl:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <div
              className="fixed inset-x-0 top-14 bg-white border-b border-slate-200 shadow-2xl z-40 xl:hidden max-h-[calc(100vh-3.5rem)] overflow-y-auto no-scrollbar animate-in slide-in-from-top-2 duration-200"
            >
              <div className="p-4 space-y-1.5">
                {/* Outlet Selector in Mobile Menu */}
                {stores && stores.length > 0 && (
                  <div className="mb-2 px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200/90 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 shrink-0">
                      <Store className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-slate-700">Outlet:</span>
                    </div>
                    <select
                      value={selectedStore?.id || ''}
                      onChange={(e) => {
                        const found = stores.find((s) => s.id === e.target.value);
                        if (found) {
                          onSelectStore(found);
                          setMobileMenuOpen(false);
                        }
                      }}
                      aria-label="Select Counter or Outlet"
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-medium text-slate-900 text-xs focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer max-w-[170px] truncate"
                    >
                      {stores.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.city?.name || 'Counter'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 pb-1">
                  Menu Navigation
                </div>
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-white font-semibold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-amber-600'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-white/80' : 'text-slate-300'}`} />
                    </button>
                  );
                })}

                {/* User Profile & Actions Inside Mobile Drawer */}
                {currentUser && (
                  <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                    <div className="px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold text-xs">
                          {currentUser.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{currentUser.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{currentUser.email}</div>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        {ROLE_LABELS[currentUser.role] || currentUser.role}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenChangePassword();
                      }}
                      className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      <span>Change Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-3 px-3.5 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out of Counter</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
