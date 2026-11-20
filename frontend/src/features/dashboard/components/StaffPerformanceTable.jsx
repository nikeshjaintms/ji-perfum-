import React from 'react';
import { Users, Award } from 'lucide-react';
import { formatIndianCurrency } from './StatCard';

export default function StaffPerformanceTable({
  data = [],
  isLoading = false,
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm h-[360px] animate-pulse flex flex-col justify-between">
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
            <Users className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Counter Staff Performance</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Cashier Velocity</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Total bills generated & revenue collected per staff associate</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          No cashier activity recorded for this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2.5">Staff Associate</th>
                <th className="pb-2.5 text-center">Bills</th>
                <th className="pb-2.5 text-right">Gross Sales</th>
                <th className="pb-2.5 text-right">Avg Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((staff, idx) => (
                <tr key={staff.cashierId} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 font-bold text-xs flex items-center justify-center border border-amber-200 shrink-0">
                        {staff.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{staff.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{staff.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center font-semibold text-slate-700">
                    {staff.billsCount}
                  </td>
                  <td className="py-2.5 px-2 text-right font-extrabold text-slate-900">
                    {formatIndianCurrency(staff.revenue)}
                  </td>
                  <td className="py-2.5 pl-2 text-right font-medium text-slate-600">
                    {formatIndianCurrency(staff.averageBill)}
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
