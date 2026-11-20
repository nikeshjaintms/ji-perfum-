import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Building2 } from 'lucide-react';
import { formatIndianCurrency } from './StatCard';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 text-white border border-slate-800 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-bold text-amber-400 mb-1">{data.storeName}</p>
        <p className="text-slate-300 text-[11px] mb-1">{data.cityName} Boutique</p>
        <p className="font-extrabold text-sm text-white">{formatIndianCurrency(data.revenue)}</p>
        <p className="text-slate-400 text-[11px] mt-1">
          {data.invoicesCount} bills • Avg ticket {formatIndianCurrency(data.averageBill)}
        </p>
      </div>
    );
  }
  return null;
};

export default function StorePerformanceChart({
  data = [],
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm h-[360px] animate-pulse flex flex-col justify-between">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="flex-1 my-6 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Boutique Outlet Performance</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Chain Comparison
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Gross revenue comparison across multi-city locations</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          No store performance data available for this range.
        </div>
      ) : (
        <div className="h-[260px] w-full" aria-label="Store Performance Chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="cityName"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                  return `₹${val}`;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#d97706" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
