import React from 'react';
import { AlertTriangle, PlusCircle, ArrowUpRight } from 'lucide-react';
import { hasPermission } from '../../../utils/permissions';
import { formatIndianCurrency } from './StatCard';

export default function LowStockTable({
  data = [],
  isLoading = false,
  currentUser,
  onQuickStockIn,
  onNavigateToProduct,
}) {
  const canManageStock = hasPermission(currentUser, 'products:stock');

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm h-[380px] animate-pulse flex flex-col justify-between">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="space-y-3 my-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Low Stock & Inventory Depletion</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            {data.length} Critical Alert{data.length === 1 ? '' : 's'}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">SKUs at or below minimum boutique threshold</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            ✓
          </div>
          <p className="font-semibold text-slate-700">Healthy Inventory</p>
          <p className="text-[11px] text-slate-400">All fragrances are adequately stocked across boutique counters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[280px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2.5">Fragrance / SKU</th>
                <th className="pb-2.5">Boutique</th>
                <th className="pb-2.5 text-center">Remaining</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.slice(0, 8).map((item) => (
                <tr key={item.stockBalanceId} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 pr-2">
                    <p className="font-semibold text-slate-900 truncate max-w-[170px]" title={item.productName}>
                      {item.productName}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.sku} • {item.volumeMl}ml</p>
                  </td>
                  <td className="py-2.5 px-2 text-slate-600 truncate max-w-[130px]">
                    {item.storeName}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                        item.quantity <= 0
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {item.quantity} left
                    </span>
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    {canManageStock ? (
                      <button
                        type="button"
                        onClick={() => onQuickStockIn && onQuickStockIn(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-sm"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Stock In
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
