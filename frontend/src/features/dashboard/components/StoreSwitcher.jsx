import React from 'react';
import { Store } from 'lucide-react';

export default function StoreSwitcher({
  stores = [],
  selectedStoreId = 'ALL',
  onChange,
  currentUser,
}) {
  // Only SUPER_ADMIN can switch stores; others have a locked boutique indicator
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  if (!isSuperAdmin) {
    const assignedStore = stores.find((s) => s.id === currentUser?.assignedStoreId);
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
        <Store className="w-3.5 h-3.5 text-slate-500" />
        <span className="truncate max-w-[160px]">{assignedStore?.name || 'Assigned Boutique'}</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <div className="absolute left-3 pointer-events-none text-amber-600">
        <Store className="w-3.5 h-3.5" />
      </div>
      <select
        value={selectedStoreId || 'ALL'}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none max-w-[220px] sm:max-w-none truncate"
      >
        <option value="ALL">All Chain Boutiques (Consolidated)</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.city?.name || 'Boutique'})
          </option>
        ))}
      </select>
    </div>
  );
}
