import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { CreditCard, Wallet, QrCode, AlertCircle } from 'lucide-react';
import { formatIndianCurrency } from './StatCard';

const METHOD_ICONS = {
  CASH: Wallet,
  UPI_QR: QrCode,
  CARD: CreditCard,
  CREDIT: AlertCircle,
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 text-white border border-slate-800 rounded-xl p-2.5 shadow-xl text-xs">
        <p className="font-semibold text-slate-300">{data.label}</p>
        <p className="text-amber-400 font-bold text-sm mt-0.5">
          {formatIndianCurrency(data.amount)}
        </p>
        <p className="text-slate-400 text-[10px]">{data.count} transaction{data.count === 1 ? '' : 's'}</p>
      </div>
    );
  }
  return null;
};

export default function PaymentDonut({
  data = [],
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm h-[360px] animate-pulse flex flex-col justify-between">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="w-40 h-40 rounded-full border-8 border-slate-100 mx-auto" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-100 rounded" />
          <div className="h-3 w-3/4 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const validData = (data || []).filter((d) => d.amount > 0);
  const totalAmount = validData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900">Payment Tender Split</h3>
          <span className="text-[11px] font-semibold text-slate-400">Total: {formatIndianCurrency(totalAmount)}</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Breakdown by payment instrument</p>
      </div>

      {validData.length === 0 ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          No payment tender data recorded for this period.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 my-2">
          {/* Donut Chart */}
          <div className="h-[180px] w-[180px] shrink-0" aria-label="Payment Method Donut Chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={validData}
                  dataKey="amount"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="none"
                >
                  {validData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full space-y-2">
            {validData.map((item) => {
              const Icon = METHOD_ICONS[item.method] || CreditCard;
              const pct = totalAmount > 0 ? ((item.amount / totalAmount) * 100).toFixed(1) : 0;
              return (
                <div key={item.method} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-700">{item.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{formatIndianCurrency(item.amount)}</span>
                    <span className="text-[10px] text-slate-400 block">{pct}% ({item.count} txns)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
