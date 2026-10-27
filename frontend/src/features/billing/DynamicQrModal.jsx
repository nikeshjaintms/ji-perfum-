import React, { useState } from 'react';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  Printer, 
  Copy, 
  Check, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Receipt,
  Banknote,
  CreditCard,
  Layers,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { paymentService } from '../../services/api';

export default function DynamicQrModal({ invoiceData, onClose, onPrintInvoice, onPrintReceipt }) {
  const [copied, setCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [currentStatus, setCurrentStatus] = useState(invoiceData?.paymentStatus || 'PENDING');
  const [txRef, setTxRef] = useState(invoiceData?.payment?.transactionReference || '');

  if (!invoiceData) return null;

  const qrDataUrl = invoiceData.payment?.qrDataUrl || invoiceData.qrCode?.qrDataUrl;
  const upiString = invoiceData.payment?.upiString || invoiceData.qrCode?.upiString;
  const grandTotal = Number(invoiceData.grandTotal || 0);

  const isSplit = invoiceData.paymentMethod === 'SPLIT';
  const isCredit = invoiceData.paymentMethod === 'CREDIT';
  const cashPay = invoiceData.payments?.find((p) => p.method === 'CASH');
  const cardPay = invoiceData.payments?.find((p) => p.method === 'CARD');
  const upiPay = invoiceData.payments?.find((p) => p.method === 'UPI_QR');
  const creditPay = invoiceData.payments?.find((p) => p.method === 'CREDIT');

  const cashAmount = invoiceData.splitDetails?.cashAmount ?? (cashPay ? Number(cashPay.amount) : 0);
  const cardAmount = invoiceData.splitDetails?.cardAmount ?? (cardPay ? Number(cardPay.amount) : 0);
  const upiAmount = invoiceData.splitDetails?.upiAmount ?? (upiPay ? Number(upiPay.amount) : (invoiceData.qrCode?.amount !== undefined ? Number(invoiceData.qrCode.amount) : (isCredit ? 0 : grandTotal)));
  const creditAmount = invoiceData.splitDetails?.creditAmount ?? (creditPay ? Number(creditPay.amount) : (isCredit ? grandTotal : Number(invoiceData.dueAmount || 0)));

  const handleCopyUpi = () => {
    if (upiString) {
      navigator.clipboard.writeText(upiString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setIsConfirming(true);
      const res = await paymentService.confirmPayment(invoiceData.id, {
        transactionReference: utrInput.trim() || undefined,
        method: invoiceData.paymentMethod || 'UPI_QR',
      });

      if (res.success) {
        setCurrentStatus(res.data.paymentStatus || 'PAID');
        setTxRef(res.data.transactionReference);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0A47E5', '#00A3FF', '#E5C07B', '#10B981'],
        });
      }
    } catch (err) {
      console.error('Failed to confirm payment:', err);
      alert('Failed to update payment status: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsConfirming(false);
    }
  };

  const isPaid = currentStatus === 'PAID';
  const isPartial = currentStatus === 'PARTIALLY_PAID' || creditAmount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="bg-slate-50/80 p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`h-10 w-10 rounded-2xl border flex items-center justify-center ${
              isCredit ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' :
              isSplit ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' :
              'bg-amber-500/10 border-amber-500/30 text-amber-600'
            }`}>
              {isCredit ? <BookOpen className="w-4 h-4" /> : isSplit ? <Layers className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600 font-semibold block">
                {isCredit ? 'Credit Due' : isSplit ? 'Multi-Tender' : 'Direct Checkout'}
              </span>
              <h3 className="text-base font-serif text-slate-900 tracking-wide">
                {isCredit ? 'Customer Credit Ledger' : isSplit ? 'Split / Partial Settlement' : 'Dynamic UPI Payment'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Invoice #{invoiceData.invoiceNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          
          {/* Status Badge */}
          {isPaid ? (
            <div className="w-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 py-2.5 px-4 rounded-full flex items-center justify-center space-x-2 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Payment Verified & Confirmed in Full</span>
            </div>
          ) : isPartial ? (
            <div className="w-full bg-amber-500/10 border border-amber-500/25 text-amber-700 py-2 px-4 rounded-full flex items-center justify-center space-x-2 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Partial Payment Recorded • Khata Balance: ₹{creditAmount.toFixed(2)}</span>
            </div>
          ) : (
            <div className="w-full bg-slate-100 border border-slate-200 text-slate-600 py-2 px-4 rounded-full flex items-center justify-center space-x-2 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Awaiting Customer UPI Scan or Counter Settlement</span>
            </div>
          )}

          {/* Split Tender Breakdown Box (if Split or Credit) */}
          {(isSplit || isCredit) && (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left space-y-1.5 text-xs">
              <div className="text-[10px] uppercase tracking-[0.16em] text-amber-600 font-semibold flex items-center space-x-1.5 mb-1">
                <Layers className="w-3 h-3" />
                <span>Tender Allocation Breakdown</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                {cashAmount > 0 && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] text-emerald-600 flex items-center justify-center space-x-1">
                      <Banknote className="w-3 h-3" />
                      <span>Cash Paid</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-900 font-mono mt-0.5 block">
                      ₹{cashAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {cardAmount > 0 && (
                  <div className="p-2 bg-purple-50 border border-purple-200 rounded-xl">
                    <span className="text-[10px] text-purple-600 flex items-center justify-center space-x-1">
                      <CreditCard className="w-3 h-3" />
                      <span>Card Swiped</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-900 font-mono mt-0.5 block">
                      ₹{cardAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {upiAmount > 0 && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-[10px] text-amber-700 flex items-center justify-center space-x-1">
                      <QrCode className="w-3 h-3" />
                      <span>UPI QR</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-900 font-mono mt-0.5 block">
                      ₹{upiAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {creditAmount > 0 && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl">
                    <span className="text-[10px] text-rose-600 flex items-center justify-center space-x-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Credit Due</span>
                    </span>
                    <span className="text-xs font-semibold text-rose-600 font-mono mt-0.5 block">
                      ₹{creditAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount Display */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">
              {upiAmount > 0 ? 'UPI Scan Amount' : isPartial ? 'Grand Total & Due' : 'Authoritative Amount'}
            </div>
            <div className="text-3xl font-bold text-amber-600 font-mono mt-1">
              ₹{(upiAmount > 0 ? upiAmount : grandTotal).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-light">
              {creditAmount > 0 && <span className="text-rose-500 font-medium mr-1.5">Khata Due: ₹{creditAmount.toFixed(2)} •</span>}
              Inclusive of 18% GST (CGST 9% + SGST 9%)
            </div>
          </div>

          {/* Dynamic QR Code Box (Only if UPI amount > 0) */}
          {upiAmount > 0 ? (
            <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-amber-300/40 relative group">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt="Dynamic UPI QR Code" 
                  className="w-52 h-52 object-contain mx-auto"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400 font-mono text-xs">
                  Generating UPI QR...
                </div>
              )}
              
              {isPaid && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center text-emerald-600 font-bold">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 mb-1 drop-shadow" />
                  <span className="text-base font-serif">PAID IN FULL</span>
                  <span className="text-xs font-mono text-slate-600 mt-0.5">Ref: {txRef}</span>
                </div>
              )}
            </div>
          ) : creditAmount > 0 ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl w-full text-center">
              <BookOpen className="w-8 h-8 text-rose-500 mx-auto mb-1.5" />
              <h4 className="text-sm font-medium text-slate-900">Partial Payment Recorded</h4>
              <p className="text-xs text-slate-600 mt-1 font-light">
                Cash Paid: <strong className="text-emerald-600 font-mono">₹{cashAmount.toFixed(2)}</strong> | Balance on Khata: <strong className="text-rose-600 font-mono">₹{creditAmount.toFixed(2)}</strong>
              </p>
            </div>
          ) : (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl w-full text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-1.5" />
              <h4 className="text-sm font-medium text-slate-900">Full Tender Settled</h4>
              <p className="text-xs text-slate-600 mt-1 font-light">
                Cash (₹{cashAmount.toFixed(2)}) + Card (₹{cardAmount.toFixed(2)}) settled at register.
              </p>
            </div>
          )}

          <div className="text-xs text-slate-500 flex items-center space-x-1.5 font-light">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Payee: <strong className="text-slate-900 font-medium">JJ PERFUME</strong> (ICICI UPI)</span>
          </div>

          {/* Copy UPI Link Button */}
          {upiString && !isPaid && (
            <button
              onClick={handleCopyUpi}
              className="text-xs text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full border border-amber-200 flex items-center space-x-1.5 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Intent Link Copied' : 'Copy Direct UPI Intent'}</span>
            </button>
          )}

          {/* Cashier Payment Confirmation controls */}
          {!isPaid && (
            <div className="w-full pt-2 border-t border-slate-200 flex flex-col space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  placeholder="Customer UPI UTR / Bank Ref (Optional)"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-mono"
                />
                <button
                  onClick={handleConfirmPayment}
                  disabled={isConfirming}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-md shadow-emerald-950/20 flex items-center space-x-1.5 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isConfirming ? 'Verifying...' : 'Mark Paid & Verify'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Print Actions */}
          <div className="w-full pt-3 border-t border-slate-200 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onPrintInvoice(invoiceData)}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-medium flex items-center justify-center space-x-2 border border-slate-200 transition"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>A4 Tax Invoice</span>
            </button>

            <button
              onClick={() => onPrintReceipt(invoiceData)}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-medium flex items-center justify-center space-x-2 border border-slate-200 transition"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>Thermal Receipt</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
