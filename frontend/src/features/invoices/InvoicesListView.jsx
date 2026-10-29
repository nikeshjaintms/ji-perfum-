import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Printer, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCw, 
  MapPin,
  Banknote,
  CreditCard,
  Layers,
  BookOpen,
  Wallet,
  X,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { billingService } from '../../services/api';

export default function InvoicesListView({ onOpenQrModal, onOpenPrintModal, stores = [] }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | PARTIALLY_PAID | PAID | CANCELLED
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');

  // Collect Due Settlement State
  const [selectedDueInvoice, setSelectedDueInvoice] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('CASH');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectError, setCollectError] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, selectedStoreFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (selectedStoreFilter !== 'ALL') {
        params.storeId = selectedStoreFilter;
      }
      if (search) {
        params.search = search;
      }
      const res = await billingService.getInvoices(params);
      setInvoices(res.data || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
      setErrorMsg('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleCancelInvoice = async (invoice) => {
    const reason = window.prompt(`Are you sure you want to cancel invoice #${invoice.invoiceNumber}? Enter cancellation reason:`);
    if (reason === null) return;

    try {
      setLoading(true);
      const res = await billingService.cancelInvoice(invoice.id, reason || 'Cancelled by store staff');
      if (res.success) {
        alert(`Invoice #${invoice.invoiceNumber} cancelled and stock has been restored to ${invoice.store?.name || 'inventory'}!`);
        fetchInvoices();
      }
    } catch (err) {
      alert('Failed to cancel invoice: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const openCollectDueModal = (inv) => {
    setSelectedDueInvoice(inv);
    setCollectAmount(inv.dueAmount ? Number(inv.dueAmount).toFixed(2) : '');
    setCollectMethod('CASH');
    setCollectNotes('');
    setCollectError('');
  };

  const handleConfirmCollectDue = async (e) => {
    e.preventDefault();
    if (!selectedDueInvoice) return;
    const num = Number(collectAmount);
    if (!num || num <= 0) {
      setCollectError('Please enter a valid payment amount.');
      return;
    }
    const currentDue = Number(selectedDueInvoice.dueAmount);
    if (num > currentDue + 0.05) {
      setCollectError(`Amount (₹${num}) cannot exceed outstanding due balance (₹${currentDue}).`);
      return;
    }

    try {
      setCollectLoading(true);
      setCollectError('');
      const res = await billingService.collectDue(selectedDueInvoice.id, {
        amount: num,
        method: collectMethod,
        notes: collectNotes.trim() || undefined,
      });

      if (res.success) {
        alert(`Payment of ₹${num} collected successfully! Outstanding Due: ₹${Number(res.data?.dueAmount || 0).toFixed(2)}`);
        const updated = res.data;
        setSelectedDueInvoice(null);
        fetchInvoices();
        if (onOpenPrintModal && updated) {
          onOpenPrintModal(updated);
        }
      }
    } catch (err) {
      setCollectError(err.response?.data?.message || err.message || 'Failed to collect payment');
    } finally {
      setCollectLoading(false);
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-slate-900">Invoices</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Every bill from every counter. Open one to print it or collect what is still due.</p>
        </div>

        {/* Search Bar & City Selector */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          {/* City / Store Filter */}
          {stores.length > 0 && (
            <div className="flex items-center bg-white border border-slate-200 hover:border-slate-300 rounded-full px-3 py-1.5 text-xs text-slate-700 shadow-sm transition">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 hover:bg-amber-600 mr-2" />
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                className="bg-transparent text-slate-900 text-xs font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-white text-slate-900">All Outlets</option>
                {stores.map((st) => (
                  <option key={st.id} value={st.id} className="bg-white text-slate-900">
                    {st.city?.name} ({st.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, guest, phone..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm transition font-sans"
            />
          </form>

          <button
            onClick={fetchInvoices}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-slate-500 hover:text-slate-900 shadow-sm transition"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-5 mb-4 overflow-x-auto border-b border-slate-200">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'PARTIALLY_PAID', label: 'Money due' },
          { id: 'PENDING', label: 'Awaiting payment' },
          { id: 'PAID', label: 'Paid' },
          { id: 'CANCELLED', label: 'Cancelled' },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              id={`filter-tab-${tab.id}`}
              onClick={() => setStatusFilter(tab.id)}
              className={`pb-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
 isActive
 ? tab.id === 'PARTIALLY_PAID'
 ? 'border-amber-500 text-slate-900 font-semibold'
 : 'border-amber-500 text-slate-900 font-semibold'
 : 'border-transparent text-slate-500 hover:text-slate-900'
 }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm ">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500 bg-slate-50/80 font-semibold">
                <th className="py-3.5 px-4 font-normal">Invoice #</th>
                <th className="py-3.5 px-4 font-normal">Counter</th>
                <th className="py-3.5 px-4 font-normal">Date</th>
                <th className="py-3.5 px-4 font-normal">Customer</th>
                <th className="py-3.5 px-4 font-normal">Items</th>
                <th className="py-3.5 px-4 font-normal">Paid by</th>
                <th className="py-3.5 px-4 font-normal">Status</th>
                <th className="py-3.5 px-4 text-right font-normal">Total / due</th>
                <th className="py-3.5 px-4 text-center font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2.5 opacity-80" />
                    <span className="text-xs text-slate-500 font-light">Loading archive...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-40" />
                    <p className="font-light text-sm text-slate-500">No records match the active criteria.</p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isPaid = inv.paymentStatus === 'PAID';
                  const isPartiallyPaid = inv.paymentStatus === 'PARTIALLY_PAID';
                  const isPending = inv.paymentStatus === 'PENDING';
                  const isCancelled = inv.paymentStatus === 'CANCELLED';
                  const hasDue = Number(inv.dueAmount || 0) > 0.01;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                      
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 tabular-nums font-medium text-amber-800 whitespace-nowrap">
                        <span className="text-slate-400 mr-0.5">#</span>
                        <span>{inv.invoiceNumber}</span>
                      </td>

                      {/* City / Store */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900 flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 hover:bg-amber-600 inline-block" />
                          <span>{inv.store?.city?.name || 'Mandvi'}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[160px] font-light">
                          {inv.store?.name}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-light">
                        {new Date(inv.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {inv.customer?.name || 'Walk-in Guest'}
                        </div>
                        {inv.customer?.phone && (
                          <div className="text-[11px] text-slate-500 tabular-nums">
                            +91 {inv.customer.phone}
                          </div>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-slate-500 font-light">
                        <span>{inv.items?.length || 0} fragrance{inv.items?.length !== 1 ? 's' : ''}</span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
 inv.paymentMethod === 'SPLIT'
 ? 'bg-amber-50 border-amber-300 text-amber-800'
 : inv.paymentMethod === 'CREDIT'
 ? 'bg-rose-50 border-rose-300 text-rose-800'
 : inv.paymentMethod === 'CASH'
 ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
 : inv.paymentMethod === 'CARD'
 ? 'bg-purple-50 border-purple-300 text-purple-800'
 : 'bg-slate-100 border-slate-200 text-slate-700'
 }`}>
                          <span>
                            {inv.paymentMethod === 'UPI_QR' 
                              ? 'UPI QR' 
                              : inv.paymentMethod === 'SPLIT' 
                              ? 'Split' 
                              : inv.paymentMethod === 'CREDIT' 
                              ? 'On credit' 
                              : (inv.paymentMethod || '').charAt(0) + (inv.paymentMethod || '').slice(1).toLowerCase()}
                          </span>
                        </span>
                        {inv.notes && (inv.notes.includes('Split:') || inv.notes.includes('Credit')) && (
                          <span className="block text-[11px] text-slate-500 tabular-nums mt-0.5 truncate max-w-[170px]">
                            {inv.notes.split('|').find(n => n.includes('Split:') || n.includes('Credit'))?.trim()}
                          </span>
                        )}
                      </td>

                      {/* Payment Status Badge with Luminous Indicator Dot */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPaid && (
                          <span className="inline-flex items-center space-x-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Paid</span>
                          </span>
                        )}
                        {isPartiallyPaid && (
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center space-x-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 hover:bg-amber-600 animate-pulse" />
                              <span>Part paid</span>
                            </span>
                            <span className="text-[11px] text-rose-600 tabular-nums pl-1">
                              ₹{Number(inv.dueAmount || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center space-x-1.5 text-[11px] font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                            <span>Awaiting payment</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center space-x-1.5 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </td>

                      {/* Payment Balance Column */}
                      <td className="py-3.5 px-4 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          ₹{Number(inv.grandTotal).toFixed(2)}
                        </div>
                        {hasDue && !isCancelled && (
                          <div className="text-[11px] text-rose-600 font-medium">
                            Due: ₹{Number(inv.dueAmount).toFixed(2)}
                          </div>
                        )}
                        {Number(inv.paidAmount || 0) > 0 && hasDue && (
                          <div className="text-[11px] text-emerald-600">
                            Recd: ₹{Number(inv.paidAmount).toFixed(2)}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Collect Due Button */}
                          {hasDue && !isCancelled && (
                            <button
                              id={`collect-due-btn-${inv.invoiceNumber}`}
                              onClick={() => openCollectDueModal(inv)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold flex items-center space-x-1 transition shadow-sm"
                              title="Collect Outstanding Balance"
                            >
                              <Wallet className="w-3 h-3" />
                              <span>Settle Due</span>
                            </button>
                          )}

                          {isPending && inv.paymentMethod === 'UPI_QR' && (
                            <button
                              onClick={() => onOpenQrModal(inv)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-full text-xs font-medium flex items-center space-x-1 border border-amber-200 transition"
                            >
                              <QrCode className="w-3 h-3 text-amber-600" />
                              <span>Scan QR</span>
                            </button>
                          )}

                          <button
                            onClick={() => onOpenPrintModal(inv)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
                            title="Print / View Invoice"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => handleCancelInvoice(inv)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Cancel Invoice & Restore Stock"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Due Settlement Modal */}
      {selectedDueInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 ">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-lg overflow-hidden p-6 text-left relative text-slate-900">
            <button
              onClick={() => setSelectedDueInvoice(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-serif text-slate-900 ">
                  Collect Customer Due
                </h3>
                <p className="text-xs text-slate-500 tabular-nums">
                  Invoice #{selectedDueInvoice.invoiceNumber} • {selectedDueInvoice.customer?.name || 'Guest'}
                </p>
              </div>
            </div>

            {/* Financial Ledger Snapshot */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-light">Invoice Grand Total:</span>
                <span className="tabular-nums text-slate-900 font-medium">₹{Number(selectedDueInvoice.grandTotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-light">Received Prior:</span>
                <span className="tabular-nums text-emerald-600 font-medium">₹{Number(selectedDueInvoice.paidAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200">
                <span className="font-medium text-rose-700">Outstanding Balance:</span>
                <span className="tabular-nums text-rose-600 font-bold text-base">₹{Number(selectedDueInvoice.dueAmount).toFixed(2)}</span>
              </div>
            </div>

            {/* Settlement Form */}
            <form onSubmit={handleConfirmCollectDue} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Amount to Collect (₹)
                  </label>
                  <button
                    type="button"
                    onClick={() => setCollectAmount(Number(selectedDueInvoice.dueAmount).toFixed(2))}
                    className="text-xs text-amber-700 hover:underline transition font-semibold"
                  >
                    Collect Full Due
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold tabular-nums">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Number(selectedDueInvoice.dueAmount)}
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-md text-base font-bold tabular-nums text-slate-900 focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>

              {/* Settlement Payment Method */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Payment method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CASH', label: 'Cash', icon: Banknote },
                    { id: 'CARD', label: 'Card Swipe', icon: CreditCard },
                    { id: 'UPI', label: 'UPI / Direct', icon: QrCode },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = collectMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCollectMethod(m.id)}
                        className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-md text-xs font-medium border transition ${
 isSelected
 ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm font-semibold'
 : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
 }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reference / Staff Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Cashier Reference / Note (Optional)
                </label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Counter cash receipt / transaction ref"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition font-sans shadow-sm"
                />
              </div>

              {collectError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center space-x-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{collectError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDueInvoice(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-collect-due-btn"
                  disabled={collectLoading}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-lg transition disabled:opacity-50"
                >
                  {collectLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Record Payment</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
