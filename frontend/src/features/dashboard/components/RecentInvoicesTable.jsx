import React from 'react';
import { Receipt, Eye, Loader2 } from 'lucide-react';
import { formatIndianCurrency } from './StatCard';

const STATUS_BADGES = {
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING: 'bg-blue-50 text-blue-700 border-blue-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function RecentInvoicesTable({
  data = [],
  isLoading = false,
  onViewInvoice,
  loadingInvoiceId = null,
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
            <Receipt className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Recent Counter Invoices</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">Latest Transactions</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">Latest generated customer bills across counters</p>
      </div>

      {!data || data.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center text-slate-400 text-xs">
          No invoices recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[280px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-2.5">Invoice #</th>
                <th className="pb-2.5">Guest & Counter</th>
                <th className="pb-2.5 text-right">Grand Total</th>
                <th className="pb-2.5 text-center">Status</th>
                <th className="pb-2.5 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.slice(0, 8).map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-2.5 pr-2 font-mono font-bold text-slate-900">
                    {inv.invoiceNumber}
                    <span className="text-[10px] text-slate-400 font-normal block font-sans">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <p className="font-semibold text-slate-800 truncate max-w-[140px]">{inv.customerName}</p>
                    <p className="text-[10px] text-slate-400">{inv.storeName}</p>
                  </td>
                  <td className="py-2.5 px-2 text-right font-extrabold text-slate-900">
                    {formatIndianCurrency(inv.grandTotal)}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        STATUS_BADGES[inv.paymentStatus] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inv.paymentStatus}
                    </span>
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    <button
                      type="button"
                      disabled={loadingInvoiceId === inv.id}
                      onClick={() => onViewInvoice && onViewInvoice(inv)}
                      className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                      title="Inspect & Print Invoice"
                    >
                      {loadingInvoiceId === inv.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
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
