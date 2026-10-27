import React from 'react';

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
}) {
  const navItems = [
    { id: 'pos', label: 'Billing' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'products', label: 'Products' },
    { id: 'users', label: 'Staff', adminOnly: true },
  ].filter((item) => !item.adminOnly || currentUser?.role === 'SUPER_ADMIN');

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          <div className="flex items-stretch gap-8 h-full min-w-0">
            <button
              onClick={() => setActiveTab('pos')}
              className="font-serif text-xl font-semibold text-slate-900 self-center whitespace-nowrap shrink-0"
            >
              JJ Perfume
            </button>

            <nav className="hidden sm:flex items-stretch gap-6" aria-label="Main">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`text-sm border-b-2 -mb-px px-0.5 transition-colors ${
                      isActive
                        ? 'border-amber-500 text-slate-900 font-semibold'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-sm min-w-0">
            {stores.length > 0 && (
              <label className="flex items-center gap-2 text-slate-500 min-w-0">
                <span className="hidden md:inline">Counter</span>
                <select
                  value={selectedStore?.id || ''}
                  onChange={(e) => {
                    const found = stores.find((s) => s.id === e.target.value);
                    if (found) onSelectStore(found);
                  }}
                  className="bg-transparent text-slate-900 font-medium border-b border-slate-300 py-0.5 pr-1 focus:outline-none focus:border-amber-500 cursor-pointer max-w-[8rem] sm:max-w-[11rem] truncate"
                >
                  {stores.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.city?.name} · {st.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="hidden sm:flex items-baseline gap-2 pl-4 border-l border-slate-200">
              <span className="font-medium text-slate-900 truncate max-w-[10rem]">{currentUser?.name || 'Cashier'}</span>
              <span className="text-slate-500 text-xs">{ROLE_LABELS[currentUser?.role] || 'Cashier'}</span>
            </div>

            {import.meta.env.DEV && (
              <button
                onClick={onQuickSwitchRole}
                title="Development only: switch between the owner and cashier demo accounts"
                className="hidden sm:inline text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
              >
                Switch role
              </button>
            )}

            <button onClick={onLogout} className="text-slate-600 hover:text-slate-900 underline underline-offset-2 decoration-slate-300">
              Sign out
            </button>
          </div>
        </div>

        <nav className="sm:hidden flex gap-5 overflow-x-auto border-t border-slate-100 -mx-4 px-4" aria-label="Main">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px ${
                  isActive ? 'border-amber-500 text-slate-900 font-semibold' : 'border-transparent text-slate-500'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
