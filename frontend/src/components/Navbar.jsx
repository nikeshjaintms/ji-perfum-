import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Receipt,
  Package,
  Users,
  Shield,
  Clock,
  LogOut,
  RefreshCw,
  MapPin,
  ChevronDown
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onQuickSwitchRole,
  stores = [],
  selectedStore,
  onSelectStore,
}) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'pos', label: 'POS Billing', icon: ShoppingBag },
    { id: 'invoices', label: 'Invoices & Receipts', icon: Receipt },
    { id: 'products', label: 'Products & SKUs', icon: Package },
    { id: 'users', label: 'Users & Roles', icon: Users, adminOnly: true },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && currentUser?.role !== 'SUPER_ADMIN') {
      return false;
    }
    return true;
  });

  return (
    <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-40 backdrop-blur-xl shadow-xs">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-7">
            <div 
              className="flex items-center space-x-3 cursor-pointer group select-none" 
              onClick={() => setActiveTab('pos')}
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/15 via-amber-100/50 to-transparent border border-amber-300 flex items-center justify-center shadow-inner group-hover:border-amber-500 transition">
                <span className="font-serif text-base font-bold text-amber-700 tracking-tighter">JJ</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-lg font-bold tracking-[0.22em] font-serif text-slate-900 group-hover:text-amber-700 transition">
                  JJ PERFUME
                </div>
                <div className="text-[9px] tracking-[0.25em] text-slate-500 uppercase font-medium">
                  Haute Parfumerie • POS & ERP
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1 pl-6 border-l border-slate-200">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 relative ${isActive
                        ? 'bg-amber-50 text-amber-950 border border-amber-300/80 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-700 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Outlet Selector, Live Clock & User Info */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">

            {/* MULTI-CITY STORE SWITCHER */}
            {stores.length > 0 && (
              <div className="relative flex items-center">
                <div className="bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 flex items-center space-x-2 text-xs transition">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500 font-medium leading-none">
                      Boutique Outlet
                    </span>
                    <select
                      value={selectedStore?.id || ''}
                      onChange={(e) => {
                        const found = stores.find((s) => s.id === e.target.value);
                        if (found) onSelectStore(found);
                      }}
                      className="bg-transparent text-slate-900 font-medium text-xs focus:outline-none cursor-pointer pr-3"
                    >
                      {stores.map((st) => (
                        <option key={st.id} value={st.id} className="bg-white text-slate-900">
                          {st.city?.name} — {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Live Boutique Clock */}
            <div className="hidden xl:flex items-center space-x-2.5 bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-[11px] text-slate-800 font-medium">{currentTime}</span>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">
                Live
              </span>
            </div>

            {/* User Profile & Role Switch */}
            <div className="flex items-center space-x-2.5 bg-slate-100/90 border border-slate-200 p-1.5 pl-3 rounded-xl">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 flex items-center justify-end space-x-1">
                  <span>{currentUser?.name || 'Cashier'}</span>
                </span>
                <span className="text-[9px] font-medium text-amber-700 uppercase tracking-widest flex items-center justify-end space-x-1">
                  <Shield className="w-2.5 h-2.5" />
                  <span>{currentUser?.role?.replace('_', ' ') || 'CASHIER'}</span>
                </span>
              </div>

              {/* Quick switch role button for testing */}
              <button
                onClick={onQuickSwitchRole}
                title="Switch between Admin and Cashier"
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition border border-transparent hover:border-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onLogout}
                title="Logout"
                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-200">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-1 px-3 text-xs font-medium ${isActive ? 'text-amber-700' : 'text-slate-500'}`}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}
