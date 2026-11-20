import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from 'lucide-react';

export function formatIndianCurrency(amount) {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function StatCard({
  title,
  value,
  isCurrency = true,
  change = 0,
  icon: Icon,
  invertTrend = false, // If true, positive increase is warning/bad (e.g. Dues, Discounts)
  subtitle,
  isLoading = false,
  badgeText,
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm animate-pulse flex flex-col justify-between h-[136px]">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-24 bg-slate-200 rounded" />
          <div className="w-9 h-9 bg-slate-100 rounded-xl" />
        </div>
        <div>
          <div className="h-7 w-32 bg-slate-200 rounded mb-2" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const isPositive = change > 0;
  const isNeutral = change === 0;

  // For dues or discounts, increase is considered a warning or neutral
  let trendColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (invertTrend) {
    trendColor = isPositive 
      ? 'text-amber-800 bg-amber-50 border-amber-200' 
      : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else {
    trendColor = isPositive 
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
      : 'text-rose-700 bg-rose-50 border-rose-200';
  }

  const displayVal = isCurrency ? formatIndianCurrency(value) : Number(value || 0).toLocaleString('en-IN');

  return (
    <div className="bg-white border border-slate-200/80 hover:border-amber-300/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-700 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {displayVal}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px]">
        {badgeText ? (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200">
            {badgeText}
          </span>
        ) : !isNeutral ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${trendColor}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
            <span className="text-[10px] font-normal opacity-75">vs prev period</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
            <Minus className="w-3 h-3" /> 0% vs prev period
          </span>
        )}

        {subtitle && (
          <span className="text-slate-400 font-normal truncate max-w-[140px]" title={subtitle}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
