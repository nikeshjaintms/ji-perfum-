import React, { useState } from 'react';
import { Award, Package, TrendingUp } from 'lucide-react';
import { formatIndianCurrency } from './StatCard';

export default function TopProductsList({
  data = { byQuantity: [], byRevenue: [] },
  isLoading = false,
}) {
  const [activeTab, setActiveTab] = useState('revenue'); // 'revenue' or 'quantity'

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm h-[400px] animate-pulse flex flex-col justify-between">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="space-y-3 my-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const items = activeTab === 'revenue' ? (data.byRevenue || []) : (data.byQuantity || []);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Bestselling Fragrances</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Top performing luxury flacons</p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'revenue'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Revenue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quantity')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'quantity'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            By Units Sold
          </button>
        </div>
      </div>

      {!items || items.length === 0 ? (
        <div className="h-[280px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          No fragrance sales recorded in this period.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-y-auto max-h-[310px] pr-1">
          {items.map((prod, index) => (
            <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : index === 1
                      ? 'bg-slate-200 text-slate-800'
                      : index === 2
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-slate-400 bg-slate-50'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate" title={prod.name}>
                    {prod.name}
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>{prod.volumeMl}ml</span>
                    <span>•</span>
                    <span className="truncate max-w-[120px]">{prod.category}</span>
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-extrabold text-slate-900 block">
                  {formatIndianCurrency(prod.revenue)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">
                  {prod.quantity} bottle{prod.quantity === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
