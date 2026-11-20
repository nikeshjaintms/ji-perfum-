import React from 'react';
import { Clock, Phone, CheckCircle2 } from 'lucide-react';
import { hasPermission } from '../../../utils/permissions';
import { formatIndianCurrency } from './StatCard';

export default function DuesTable({
  data = [],
  isLoading = false,
  currentUser,
  onCollectDue,
}) {
  const canSettle = hasPermission(currentUser, 'billing:settle');

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

  const totalOutstanding = data.reduce((acc, curr) => acc + (curr.dueAmount || 0), 0);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Pending Customer Dues</h3>
          </div>
          <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            {formatIndianCurrency(totalOutstanding)} Due
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Credit sales awaiting settlement, ordered by balance</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
          <p className="font-semibold text-slate-700">Zero Overdue Receivables</p>
          <p className="text-[11px] text-slate-400">All customer invoices have been settled in full.</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[280px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2.5">Customer / Invoice</th>
                <th className="pb-2.5">Contact</th>
                <th className="pb-2.5 text-right">Outstanding</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.slice(0, 8).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 pr-2">
                    <p className="font-semibold text-slate-900 truncate max-w-[150px]" title={inv.customerName}>
                      {inv.customerName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">#{inv.invoiceNumber}</p>
                  </td>
                  <td className="py-2.5 px-2 text-slate-600">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{inv.customerPhone || 'N/A'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">{inv.ageDays} day{inv.ageDays === 1 ? '' : 's'} ago</span>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span className="font-extrabold text-rose-600 text-xs block">
                      {formatIndianCurrency(inv.dueAmount)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Total: {formatIndianCurrency(inv.grandTotal)}
                    </span>
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    {canSettle ? (
                      <button
                        type="button"
                        onClick={() => onCollectDue && onCollectDue(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-sm"
                      >
                        Settle
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Protected</span>
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
