import React from 'react';
import { Sparkles } from 'lucide-react';
import { formatIndianCurrency } from './StatCard';

const SCENT_FAMILY_COLORS = [
  'bg-amber-500',
  'bg-rose-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-slate-500',
];

export default function CategorySalesChart({
  data = [],
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm h-[360px] animate-pulse flex flex-col justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="space-y-4 my-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between h-3 bg-slate-100 rounded w-full" />
              <div className="h-2 bg-slate-100 rounded-full w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900">Scent Families & Categories</h3>
          <span className="text-[11px] font-semibold text-slate-400">Share of Revenue</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Fragrance olfactive family distribution</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          No fragrance categories sold in this period.
        </div>
      ) : (
        <div className="space-y-3.5 my-2">
          {data.slice(0, 5).map((cat, idx) => {
            const colorClass = SCENT_FAMILY_COLORS[idx % SCENT_FAMILY_COLORS.length];
            return (
              <div key={cat.categoryId} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-semibold text-slate-800">{cat.categoryName}</span>
                    <span className="text-[10px] text-slate-400">({cat.bottlesSold} bottles)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{formatIndianCurrency(cat.revenue)}</span>
                    <span className="text-[10px] font-bold text-slate-500 w-9 text-right">{cat.sharePercentage}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                    style={{ width: `${Math.min(100, Math.max(2, cat.sharePercentage))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
