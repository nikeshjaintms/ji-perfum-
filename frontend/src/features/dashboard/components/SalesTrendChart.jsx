import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, FileText, RefreshCw } from 'lucide-react';
import { formatIndianCurrency } from './StatCard';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-xl p-3 shadow-xl text-xs">
        <p className="font-semibold text-slate-300 mb-1">{data.date}</p>
        <p className="text-amber-400 font-bold text-sm">
          {formatIndianCurrency(data.revenue)}
        </p>
        <p className="text-slate-400 text-[11px] mt-0.5">
          {data.bills} bill{data.bills === 1 ? '' : 's'} issued
        </p>
      </div>
    );
  }
  return null;
};

export default function SalesTrendChart({
  data = [],
  isLoading = false,
  error = null,
  onRetry,
}) {
  const [metric, setMetric] = useState('revenue'); // 'revenue' or 'bills'

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm h-[380px] flex flex-col justify-between animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-8 w-28 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex-1 my-6 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm h-[380px] flex flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold text-rose-600 mb-2">Failed to load sales trend</p>
        <p className="text-xs text-slate-400 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        )}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm h-[380px] flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 mb-1">No sales data recorded</h4>
        <p className="text-xs text-slate-400 max-w-sm">
          No finalized transactions exist for the selected date range and boutique counter.
        </p>
      </div>
    );
  }

  const totalPeriodRevenue = data.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const totalPeriodBills = data.reduce((acc, curr) => acc + (curr.bills || 0), 0);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">Revenue & Billing Velocity</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Daily Trend
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Total {formatIndianCurrency(totalPeriodRevenue)} across {totalPeriodBills} counter bills
          </p>
        </div>

        {/* Metric Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              metric === 'revenue'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            Revenue (₹)
          </button>
          <button
            type="button"
            onClick={() => setMetric('bills')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              metric === 'bills'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Invoices Count
          </button>
        </div>
      </div>

      <div className="h-[280px] w-full" aria-label="Sales Trend Daily Chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                const parts = v.split('-');
                return `${parts[2]}/${parts[1]}`;
              }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => {
                if (metric === 'revenue') {
                  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
                  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                  return `₹${val}`;
                }
                return val;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={metric === 'revenue' ? '#d97706' : '#2563eb'}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={metric === 'revenue' ? 'url(#amberGradient)' : 'url(#blueGradient)'}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
