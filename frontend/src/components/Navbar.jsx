import React from 'react';
import { 
  Plus, 
  Receipt, 
  FileText, 
  Sparkles, 
  FolderTree, 
  Users, 
  Store, 
  LogOut, 
  User, 
  RefreshCw,
  KeyRound
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
  const navItems = [
    { id: 'pos', label: 'Billing', icon: Receipt },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'categories', label: 'Category Master', icon: FolderTree, adminOnly: true },
    { id: 'products', label: 'Products', icon: Sparkles },
    { id: 'users', label: 'Staff', icon: Users, adminOnly: true },
  ].filter((item) => !item.adminOnly || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'STORE_MANAGER');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
          <div className="flex items-stretch gap-4 lg:gap-8 h-full min-w-0 shrink-0">
            <button
              onClick={() => setActiveTab('pos')}
              className="font-serif text-lg sm:text-xl font-semibold text-slate-900 self-center whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
            >
              <img src="/logo.webp" alt="JI" className="h-6 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              {/* <span>JI Perfume</span> */}
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-stretch gap-6" aria-label="Main">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`text-sm border-b-2 -mb-px px-1 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
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

          <div className="flex items-center gap-1 sm:gap-3 text-xs sm:text-sm min-w-0 shrink-0">
            {stores.length > 0 ? (
              <div className="relative flex items-center space-x-1 shrink min-w-0">
                <div className="bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 hover:border-slate-300 rounded-xl px-1.5 sm:px-3 py-1 sm:py-1.5 flex items-center space-x-1 sm:space-x-1.5 text-xs transition min-w-0">
                  <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="hidden sm:block text-[9px] uppercase tracking-[0.15em] text-slate-500 font-semibold leading-none">
                      Boutique Outlet
                    </span>
                    <select
                      value={selectedStore?.id || ''}
                      onChange={(e) => {
                        const found = stores.find((s) => s.id === e.target.value);
                        if (found) onSelectStore(found);
                      }}
                      className="bg-transparent text-slate-900 font-medium text-xs focus:outline-none cursor-pointer pr-0.5 truncate max-w-[65px] min-[360px]:max-w-[85px] sm:max-w-[160px] md:max-w-[200px]"
                    >
                      {stores.map((st) => (
                        <option key={st.id} value={st.id} className="bg-white text-slate-900">
                          {st.city?.name} — {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={onOpenAddOutlet}
                  id="add-outlet-city-btn"
                  title="Add Boutique Outlet"
                  className="p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-100/90 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 rounded-xl text-amber-700 transition cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs font-medium text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Add Outlet</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAddOutlet}
                id="add-outlet-city-btn"
                title="Add Boutique Outlet"
                className="px-2.5 sm:px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs font-medium text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Outlet</span>
              </button>
            )}

            {currentUser && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                title="Change Password"
                className="group flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-3 border-l border-slate-200 shrink-0 hover:bg-amber-50/80 px-1 sm:px-2 py-1 rounded-xl transition-all cursor-pointer text-left border border-transparent hover:border-amber-200"
              >
                <div className="w-7 h-7 rounded-full bg-amber-50 group-hover:bg-amber-100 border border-amber-200 group-hover:border-amber-300 flex items-center justify-center text-amber-800 shrink-0 transition-colors shadow-2xs">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="hidden sm:flex flex-col min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-900 group-hover:text-amber-900 truncate max-w-[6rem] md:max-w-[10rem] text-xs leading-none transition-colors">
                      {currentUser.name}
                    </span>
                    <KeyRound className="w-3 h-3 text-slate-400 group-hover:text-amber-600 transition-colors" />
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 leading-none">
                    {ROLE_LABELS[currentUser.role] || currentUser.role}
                  </span>
                </div>
              </button>
            )}

            <button
              onClick={onLogout}
              title="Sign out of counter"
              className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-transparent hover:border-rose-200 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Strip on Mobile & Tablets (< 1024px) */}
        <nav
          className="lg:hidden flex flex-wrap items-center gap-1 sm:gap-2 py-2 border-t border-slate-100"
          aria-label="Navigation Strip"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`subnav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'} shrink-0`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
