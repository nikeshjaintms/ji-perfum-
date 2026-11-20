import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FolderTree, 
  Building2, 
  Users, 
  ShieldCheck, 
  Store, 
  LogOut, 
  User, 
  KeyRound, 
  Menu, 
  X, 
  ChevronRight,
  ArrowRight,
  Receipt,
  Layers
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Owner',
  STORE_MANAGER: 'Manager',
  CASHIER: 'Cashier',
};

export const ADMIN_MASTERS_LIST = [
  { 
    id: 'products', 
    label: 'Products Master', 
    shortLabel: 'Products',
    desc: 'Fragrance catalog, SKUs, barcode registry & stock',
    icon: Sparkles,
    tag: 'Catalog'
  },
  { 
    id: 'categories', 
    label: 'Category Master', 
    shortLabel: 'Categories',
    desc: 'Scent families, notes & taxonomy hierarchy',
    icon: FolderTree,
    tag: 'Taxonomy'
  },
  { 
    id: 'outlets', 
    label: 'Outlet & Store Master', 
    shortLabel: 'Outlets',
    desc: 'Boutique locations, cities, GSTIN & UPI details',
    icon: Building2,
    tag: 'Locations'
  },
  { 
    id: 'users', 
    label: 'Users Master', 
    shortLabel: 'Users',
    desc: 'Staff accounts, outlet assignments & credentials',
    icon: Users,
    tag: 'Accounts'
  },
  { 
    id: 'roles', 
    label: 'Roles & Permissions Master', 
    shortLabel: 'Roles & Permissions',
    desc: 'Access matrix, capability policies & CRUD controls',
    icon: ShieldCheck,
    tag: 'Security'
  },
];

export default function AdminNavbar({
  activeMaster = 'products',
  onSelectMaster,
  currentUser,
  onLogout,
  stores = [],
  selectedStore,
  onSelectStore,
  onOpenChangePassword,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMasterClick = (masterId) => {
    if (onSelectMaster) {
      onSelectMaster(masterId);
    }
    setDrawerOpen(false);
  };

  const currentMasterObj = ADMIN_MASTERS_LIST.find((m) => m.id === activeMaster) || ADMIN_MASTERS_LIST[0];

  return (
    <>
      <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-40 no-print shadow-2xs">
        <div className="max-w-[1700px] mx-auto px-3 sm:px-5 lg:px-7">
          <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
            
            {/* Left: Hamburger Button, Brand Logo & Active Master Badge */}
            <div className="flex items-center gap-2.5 sm:gap-4 h-full min-w-0">
              {/* Hamburger Button for Admin Drawer */}
              <button
                type="button"
                id="admin-hamburger-btn"
                onClick={() => setDrawerOpen(true)}
                className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center justify-center shrink-0 shadow-2xs"
                title="Open Admin Masters Drawer"
                aria-label="Open Admin Masters Drawer"
              >
                <Menu className="w-5 h-5 text-slate-800" />
              </button>

              {/* Brand Logo with Admin Tag */}
              <Link
                to="/admin"
                className="flex items-center gap-1.5 shrink-0 hover:opacity-90 transition pr-1"
                title="JI Perfume - Admin Master Portal"
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
                <span className="hidden sm:inline font-serif text-sm font-bold tracking-tight text-slate-900">
                  JI <span className="text-amber-600 font-light">PERFUME</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-mono">
                  ADMIN
                </span>
              </Link>

              {/* Active Master Indicator Pill (Clicking opens drawer) */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 rounded-xl text-xs font-semibold text-slate-900 transition cursor-pointer shadow-2xs"
                title="Click to switch master"
              >
                <currentMasterObj.icon className="w-3.5 h-3.5 text-amber-600" />
                <span>{currentMasterObj.label}</span>
                <span className="text-[10px] text-amber-700/70 font-normal pl-1">
                  (Switch ☰)
                </span>
              </button>
            </div>

            {/* Right: Switch to POS, Store Selector, User Profile & Sign Out */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm shrink-0">
              {/* Quick Switch to POS Counter */}
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 font-semibold rounded-xl text-xs transition shadow-2xs whitespace-nowrap"
                title="Switch to POS Counter"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">POS Counter</span>
                <ArrowRight className="w-3 h-3 hidden sm:inline text-slate-400 shrink-0" />
              </Link>


              {/* User Profile */}
              {currentUser && (
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  title="Change Password"
                  className="flex items-center gap-2 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 px-2 py-1 sm:px-2.5 rounded-xl transition cursor-pointer shadow-2xs"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
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
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* LUXURY ADMIN HAMBURGER DRAWER (SLIDE-IN SIDEBAR FROM LEFT) */}
      {/* ============================================================ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden no-print animate-fadeIn">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-80 sm:w-96 bg-white border-r border-slate-200 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-left duration-200">
              
              {/* Drawer Top Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-amber-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo_transparent.png"
                    alt="JI Perfume"
                    className="h-8 w-auto object-contain"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-serif text-sm font-bold text-slate-900 tracking-tight">
                        JI PERFUME
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-mono">
                        ADMIN
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mt-0.5">
                      Boutique Masters Hub
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content: All 5 Masters Navigation */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
                <div>
                  <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Admin Masters (5)</span>
                    <span className="text-amber-600 font-mono text-[9px]">Select Master</span>
                  </div>

                  <div className="space-y-1">
                    {ADMIN_MASTERS_LIST.map((master) => {
                      const isActive = activeMaster === master.id;
                      const Icon = master.icon;

                      return (
                        <button
                          key={master.id}
                          id={`drawer-master-${master.id}`}
                          onClick={() => handleMasterClick(master.id)}
                          className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3 border ${
                            isActive
                              ? 'bg-amber-500 text-white border-amber-500 shadow-md font-semibold'
                              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90'
                          }`}
                        >
                          <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold leading-tight">{master.label}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                {master.tag}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-0.5 line-clamp-1 ${
                              isActive ? 'text-white/80' : 'text-slate-500'
                            }`}>
                              {master.desc}
                            </p>
                          </div>

                          <ChevronRight className={`w-4 h-4 self-center shrink-0 ${
                            isActive ? 'text-white/80' : 'text-slate-300'
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Operations Section: Link to POS */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Retail Operations
                  </div>

                  <Link
                    to="/"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-slate-800 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition">
                          Return to POS Counter
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Checkout, barcode scanning & bills
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                  </Link>
                </div>

                {/* Multi-City Store Selector in Drawer */}
                {stores && stores.length > 0 && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-amber-600" />
                        <span>Active Boutique Outlet</span>
                      </span>
                    </div>
                    <select
                      value={selectedStore?.id || ''}
                      onChange={(e) => {
                        const st = stores.find((s) => s.id === e.target.value);
                        if (st && onSelectStore) onSelectStore(st);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                    >
                      {stores.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.city?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Drawer Bottom Profile & Sign Out Footer */}
              {currentUser && (
                <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center shrink-0">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {currentUser.email}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                      {ROLE_LABELS[currentUser.role] || currentUser.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        onOpenChangePassword();
                      }}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>Password</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false);
                        onLogout();
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 transition flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
