import React from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, RotateCcw, XCircle, ShoppingBag } from 'lucide-react';

const MOVEMENT_ICONS = {
  SALE: ShoppingBag,
  PURCHASE_RECEIPT: ArrowDownLeft,
  ADJUSTMENT: ArrowUpRight,
  RETURN: RotateCcw,
  CANCEL: XCircle,
};

const MOVEMENT_COLORS = {
  SALE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PURCHASE_RECEIPT: 'bg-blue-50 text-blue-700 border-blue-200',
  ADJUSTMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  RETURN: 'bg-purple-50 text-purple-700 border-purple-200',
  CANCEL: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function RecentActivityFeed({
  data = [],
  isLoading = false,
}) {
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
            <Activity className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Audit & Inventory Activity</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Live Feed</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Real-time stock transactions, restocks & voids</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          No audit activity recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[280px] pr-1">
          {data.map((item) => {
            const Icon = MOVEMENT_ICONS[item.movementType] || Activity;
            const badgeClass = MOVEMENT_COLORS[item.movementType] || 'bg-slate-100 text-slate-700';

            return (
              <div key={item.id} className="py-2.5 flex items-start gap-3 hover:bg-slate-50/50 rounded-xl px-2 transition">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${badgeClass}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.activityType === 'INVOICE_CANCELLED'
                        ? `Invoice #${item.invoiceNumber} Voided`
                        : `${item.movementType}: ${item.productName}`}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {item.notes || `${item.storeName} by ${item.userName}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
