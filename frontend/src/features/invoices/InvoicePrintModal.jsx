import React, { useState, useEffect } from 'react';
import { X, Printer, Receipt, FileText, MapPin } from 'lucide-react';
import QRCode from 'qrcode';
import { numberToWords } from '../../utils/numberToWords';

export default function InvoicePrintModal({ invoice, mode = 'a4', onClose }) {
  const [currentMode, setCurrentMode] = useState(mode); // 'a4' or 'thermal'
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  
  // Default to true as user already has pre-printed letterhead with company details
  const [hideLetterhead, setHideLetterhead] = useState(true);
  const [letterheadSpacing, setLetterheadSpacing] = useState('0'); // '0', '35', '60' in px

  if (!invoice) return null;

  // Resolve Store & City specific details
  const store = invoice.store || {};
  const city = store.city || {};

  const storeName = store.name || 'J I Perfume';
  const storeAddress = store.address || 'Heritage Bazar, Near Main Gate, Mandvi - 370465, Kutch, Gujarat';
  const storePhone = store.phone || '+91 98765 43210';
  const storeGstin = store.gstin || '24AABCJ1234F1Z5';
  const stateName = city.state || 'Gujarat';
  const stateCode = city.stateCode || '24';
  const jurisdictionText = city.jurisdictionText || 'Subject to Mandvi Jurisdiction.';
  const storeUpi = store.upiId || 'jjperfumes@icici';

  // Generate or resolve Dynamic QR code
  useEffect(() => {
    const upiPay = invoice.payments?.find((p) => p.method === 'UPI_QR');
    const existingQr = upiPay?.qrDataUrl || invoice.payments?.[0]?.qrDataUrl || invoice.payment?.qrDataUrl || invoice.qrCode?.qrDataUrl;
    
    if (existingQr) {
      setQrCodeUrl(existingQr);
    } else {
      const isSplitWithoutUpi = invoice.paymentMethod === 'SPLIT' && (!upiPay || Number(upiPay.amount) <= 0);
      if (isSplitWithoutUpi) {
        setQrCodeUrl(null);
      } else {
        const upiAmt = upiPay ? Number(upiPay.amount) : Number(invoice.grandTotal || 0);
        const upiString = `upi://pay?pa=${storeUpi}&pn=${encodeURIComponent(storeName)}&am=${upiAmt.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Bill ' + invoice.invoiceNumber)}`;
        
        QRCode.toDataURL(upiString, {
          width: 180,
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' },
        }).then((url) => setQrCodeUrl(url)).catch(console.error);
      }
    }
  }, [invoice, storeUpi, storeName]);

  const handlePrint = () => {
    window.print();
  };

  // Format Date as DD/MM/YYYY
  const createdDate = new Date(invoice.createdAt || Date.now());
  const day = String(createdDate.getDate()).padStart(2, '0');
  const month = String(createdDate.getMonth() + 1).padStart(2, '0');
  const year = createdDate.getFullYear();
  const formattedBillDate = `${day}/${month}/${year}`;

  // Customer info
  const customerName = invoice.customer?.name || 'SHREEYA';
  const customerPhone = invoice.customer?.phone || '9328078951';

  // Compute item rows according to the user's invoice calculation formula
  const items = (invoice.items || []).map((item, idx) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const netAmt = Number(item.totalAmount) || Number((unitPrice * qty).toFixed(2));
    
    // Tax rate (standard 18%)
    const taxPct = 18;
    const rate = Number((unitPrice / (1 + taxPct / 100)).toFixed(2));
    const gross = Number((rate * qty).toFixed(2));
    const taxAmt = Number((netAmt - gross).toFixed(2));

    return {
      sr: idx + 1,
      name: item.productName || item.product?.name || 'Perfume',
      qty,
      rate,
      gross,
      taxPct,
      taxAmt,
      netAmt,
    };
  });

  // Calculate Column Totals
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const totalGross = Number(items.reduce((sum, i) => sum + i.gross, 0).toFixed(2));
  const totalTaxAmt = Number(items.reduce((sum, i) => sum + i.taxAmt, 0).toFixed(2));
  const totalNetBeforeDiscount = Number(items.reduce((sum, i) => sum + i.netAmt, 0).toFixed(2));
  
  // Extra Discount
  const extraDiscount = Number(invoice.discountAmount || 0);

  // Final Net Payable
  const finalNet = Number(invoice.grandTotal || (totalNetBeforeDiscount - extraDiscount)).toFixed(2);

  // Taxes breakdown
  const cgstAmt = Number((totalTaxAmt / 2).toFixed(2));
  const sgstAmt = Number((totalTaxAmt - cgstAmt).toFixed(2));

  // Amount in words
  const wordsText = numberToWords(Number(finalNet));

  // Financial balances (Paid vs Credit Due)
  const paidAmount = Number(invoice.paidAmount ?? (invoice.paymentStatus === 'PAID' ? finalNet : 0));
  const dueAmount = Number(invoice.dueAmount ?? (invoice.paymentStatus === 'PAID' ? 0 : Math.max(0, Number(finalNet) - paidAmount)));

  // Determine Payment Method Label (with detailed Multi-Tender Split & Credit breakdown)
  let paymentMethodLabel = 'CASH';
  if (invoice.paymentMethod === 'UPI_QR') {
    paymentMethodLabel = 'UPI';
  } else if (invoice.paymentMethod === 'CREDIT') {
    paymentMethodLabel = 'CREDIT (CUSTOMER KHATA)';
  } else if (invoice.paymentMethod === 'SPLIT') {
    if (invoice.payments && invoice.payments.length > 0) {
      const parts = invoice.payments
        .filter((p) => Number(p.amount) > 0)
        .map((p) => {
          const m = p.method === 'UPI_QR' ? 'UPI' : p.method === 'CREDIT' ? 'CREDIT (DUE)' : p.method;
          return `${m}: ₹${Number(p.amount).toFixed(2)}`;
        });
      paymentMethodLabel = `SPLIT (${parts.join(' | ')})`;
    } else if (invoice.notes && invoice.notes.includes('Split:')) {
      const match = invoice.notes.match(/Split:\s*([^|]+)/);
      paymentMethodLabel = match ? `SPLIT (${match[1].trim()})` : 'SPLIT';
    } else {
      paymentMethodLabel = 'SPLIT';
    }
  } else {
    paymentMethodLabel = invoice.paymentMethod || 'CASH';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      {/* Dynamic @page CSS based on selected mode */}
      <style>{`
        @media print {
          @page {
            size: ${currentMode === 'a4' ? 'A4 portrait' : '80mm auto'};
            margin: ${currentMode === 'a4' ? '8mm' : '2mm'};
          }
        }
      `}</style>

      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full my-6 overflow-hidden shadow-2xl flex flex-col">
        
        {/* Top Control Bar (Hidden during Print) */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          
          {/* Format Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentMode('a4')}
              id="print-tab-a4"
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1.5 transition ${
                currentMode === 'a4'
                  ? 'bg-amber-500/10 text-amber-700 border border-amber-300 shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-900 border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>A4 Tax Invoice (Main Invoice)</span>
            </button>
            <button
              onClick={() => setCurrentMode('thermal')}
              id="print-tab-thermal"
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1.5 transition ${
                currentMode === 'thermal'
                  ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-300 shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>80mm Thermal Receipt</span>
            </button>
          </div>

          {/* Pre-printed Letterhead Toggle Controls */}
          <div className="flex items-center space-x-3 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-700 hover:text-slate-900 select-none">
              <input
                type="checkbox"
                checked={hideLetterhead}
                onChange={(e) => setHideLetterhead(e.target.checked)}
                className="rounded border-slate-400 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
              />
              <span className="font-medium text-xs">
                Pre-printed Letterhead (Direct Details)
              </span>
            </label>

            {hideLetterhead && currentMode === 'a4' && (
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 border-l border-slate-300 pl-3">
                <span className="font-light">Top Gap:</span>
                <select
                  value={letterheadSpacing}
                  onChange={(e) => setLetterheadSpacing(e.target.value)}
                  className="bg-white text-slate-800 px-2 py-0.5 rounded-md border border-slate-300 text-[11px] focus:outline-none"
                >
                  <option value="0">0mm (Direct)</option>
                  <option value="35">35mm</option>
                  <option value="60">60mm</option>
                  <option value="90">90mm</option>
                </select>
              </div>
            )}
          </div>

          {/* Print & Close */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              id="confirm-print-btn"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black rounded-full text-xs font-semibold tracking-wide transition shadow-md shadow-amber-950/20 flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{currentMode === 'a4' ? 'Print A4 Invoice' : 'Print Thermal Receipt'}</span>
            </button>
            <button
              onClick={onClose}
              id="close-print-modal-btn"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable View Area */}
        <div className="p-6 overflow-y-auto max-h-[82vh] flex justify-center bg-slate-100">
          
          {/* ========================================================= */}
          {/* 1. STANDARD TAX INVOICE (A4 Page: 210mm x 297mm) */}
          {/* ========================================================= */}
          {currentMode === 'a4' && (
            <div 
              id="printable-receipt" 
              className="bg-white text-black p-8 rounded-none shadow-2xl w-full max-w-[210mm] border-2 border-black font-sans text-[11.5px] leading-tight select-text relative"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif', minHeight: '297mm' }}
            >
              {/* Optional Top Letterhead Spacer if pre-printed paper has high header */}
              {hideLetterhead && Number(letterheadSpacing) > 0 && (
                <div style={{ height: `${letterheadSpacing}px` }} className="w-full" />
              )}

              {/* Company Header: Only shown if hideLetterhead is false */}
              {!hideLetterhead && (
                <div className="border border-dashed border-gray-400 p-3 mb-2 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src="/logo.webp" alt={storeName} className="h-10 object-contain" />
                    <div>
                      <h1 className="text-base font-bold tracking-wider uppercase text-blue-900 font-serif">
                        {storeName}
                      </h1>
                      <p className="text-[10px] text-gray-600">Luxury Fragrances & Attars</p>
                      <p className="text-[10px] text-gray-600">{storeAddress}</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-gray-600 space-y-0.5">
                    <p>GSTIN: <strong className="text-black">{storeGstin}</strong></p>
                    <p>Tel: {storePhone}</p>
                    <p>State: {stateName} (Code: {stateCode})</p>
                  </div>
                </div>
              )}

              {/* Centered Tax Invoice Bar - Starts DIRECTLY here for pre-printed letterhead! */}
              <div className="border-t border-b border-black py-1 text-center font-bold text-xs uppercase tracking-wide">
                Tax Invoice
              </div>

              {/* Bill To & Metadata Row (Divided in two columns by black line) */}
              <div className="border-b border-black flex">
                {/* Left: Customer Info */}
                <div className="w-[65%] p-2 border-r border-black">
                  <div className="font-semibold">Bill To : {customerName}</div>
                  <div className="text-gray-800">{customerPhone}</div>
                </div>

                {/* Right: Bill No & Date */}
                <div className="w-[35%] p-2 text-left space-y-0.5">
                  <div className="flex">
                    <span className="w-16 font-semibold">Bill No</span>
                    <span>: &nbsp;{invoice.invoiceNumber || '532'}</span>
                  </div>
                  <div className="flex">
                    <span className="w-16 font-semibold">Bill Date</span>
                    <span>: &nbsp;{formattedBillDate}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="w-full">
                <table className="w-full border-collapse border-b border-black text-left">
                  <thead>
                    <tr className="border-b border-black font-semibold text-[10px]">
                      <th className="py-1 px-1.5 border-r border-black text-center w-[5%]">Sr</th>
                      <th className="py-1 px-2 border-r border-black w-[40%]">ItemName</th>
                      <th className="py-1 px-1 border-r border-black text-center w-[7%]">Qty</th>
                      <th className="py-1 px-1.5 border-r border-black text-right w-[11%]">Rate</th>
                      <th className="py-1 px-1.5 border-r border-black text-right w-[11%]">Gross</th>
                      <th className="py-1 px-1 border-r border-black text-center w-[6%]">Tax</th>
                      <th className="py-1 px-1.5 border-r border-black text-right w-[10%]">Tax Amt</th>
                      <th className="py-1 px-2 text-right w-[10%]">Net Amt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.sr} className="align-top">
                        <td className="py-1 px-1.5 border-r border-black text-center">{item.sr}</td>
                        <td className="py-1 px-2 border-r border-black font-medium">{item.name}</td>
                        <td className="py-1 px-1 border-r border-black text-center">{item.qty}</td>
                        <td className="py-1 px-1.5 border-r border-black text-right font-mono">{item.rate.toFixed(2)}</td>
                        <td className="py-1 px-1.5 border-r border-black text-right font-mono">{item.gross.toFixed(2)}</td>
                        <td className="py-1 px-1 border-r border-black text-center">{item.taxPct}</td>
                        <td className="py-1 px-1.5 border-r border-black text-right font-mono">{item.taxAmt.toFixed(2)}</td>
                        <td className="py-1 px-2 text-right font-mono font-medium">{item.netAmt.toFixed(2)}</td>
                      </tr>
                    ))}

                    {/* Minimum visual height spacer so lines look like accounting ledger */}
                    {items.length < 5 && (
                      <tr style={{ height: `${Math.max(40, (5 - items.length) * 22)}px` }}>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                        <td></td>
                      </tr>
                    )}
                  </tbody>

                  {/* Summary / Total Row */}
                  <tfoot>
                    <tr className="border-t border-black font-semibold text-[10px]">
                      <td className="py-1 px-1.5 border-r border-black text-center">Total</td>
                      <td className="py-1 px-2 border-r border-black text-center">{items.length}</td>
                      <td className="py-1 px-1 border-r border-black text-center">{totalQty}</td>
                      <td className="py-1 px-1.5 border-r border-black"></td>
                      <td className="py-1 px-1.5 border-r border-black text-right font-mono">{totalGross.toFixed(2)}</td>
                      <td className="py-1 px-1 border-r border-black"></td>
                      <td className="py-1 px-1.5 border-r border-black text-right font-mono">{totalTaxAmt.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right font-mono font-bold">{totalNetBeforeDiscount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tax Breakdown & Extra Discount Block */}
              <div className="border-b border-black flex">
                {/* Left Mini-Table: Tax Rate | Taxable Amt | CGST Amt | SGST Amt | Total Tax */}
                <div className="w-[68%] border-r border-black">
                  <table className="w-full text-center border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-black font-medium">
                        <th className="py-1 px-1 border-r border-black">Tax Rate</th>
                        <th className="py-1 px-1 border-r border-black">Taxable Amt</th>
                        <th className="py-1 px-1 border-r border-black">CGST Amt</th>
                        <th className="py-1 px-1 border-r border-black">SGST Amt</th>
                        <th className="py-1 px-1">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1 px-1 border-r border-black">18 %</td>
                        <td className="py-1 px-1 border-r border-black font-mono">{totalGross.toFixed(2)}</td>
                        <td className="py-1 px-1 border-r border-black font-mono">{cgstAmt.toFixed(2)}</td>
                        <td className="py-1 px-1 border-r border-black font-mono">{sgstAmt.toFixed(2)}</td>
                        <td className="py-1 px-1 font-mono font-medium">{totalTaxAmt.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right: Extra Discount */}
                <div className="w-[32%] p-1.5 flex items-center justify-between text-xs font-semibold">
                  <span>Extra Discount</span>
                  <span className="font-mono text-sm">{extraDiscount.toFixed(2)}</span>
                </div>
              </div>

              {/* Amount in Words & Net Amount */}
              <div className="border-b border-black flex items-center justify-between p-1.5 text-xs">
                <div className="w-[65%] italic pr-2 font-medium">
                  {wordsText}
                </div>
                <div className="w-[35%] flex items-center justify-between pl-4">
                  <span className="text-sm font-bold">Net :</span>
                  <span className="text-base font-extrabold font-mono tracking-tight">{finalNet}</span>
                </div>
              </div>

              {/* Partial Payment / Credit Due Summary Row (if dueAmount > 0) */}
              {dueAmount > 0 && (
                <div className="border-b border-black flex items-center justify-between p-1.5 text-xs bg-gray-50">
                  <div className="w-[65%] text-[10px] text-gray-700">
                    <span>Amount Received: <strong>₹{paidAmount.toFixed(2)}</strong></span>
                  </div>
                  <div className="w-[35%] flex items-center justify-between pl-4 text-red-700 font-bold">
                    <span className="text-xs">Balance Due :</span>
                    <span className="text-sm font-mono font-extrabold">₹{dueAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Footer Section: Terms, Dynamic QR Code, and Multi-City Jurisdiction */}
              <div className="pt-2 flex justify-between items-start text-[10px]">
                
                {/* Left: Terms & Conditions with City Jurisdiction */}
                <div className="w-[38%] space-y-0.5">
                  <div className="font-bold underline">Terms & Conditions</div>
                  <div>1.Goods once sold will not be taken back.</div>
                  <div>2.{jurisdictionText}</div>
                  <div className="pt-5 italic font-medium">E & O.E.</div>
                </div>

                {/* Center: Dynamic QR Code [ Scan & Pay ] */}
                <div className="w-[28%] flex flex-col items-center justify-center">
                  <div className="font-semibold text-[9px] mb-1">[ &nbsp;Scan & Pay&nbsp; ]</div>
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Scan & Pay" className="w-24 h-24 object-contain border border-black p-0.5" />
                  ) : (
                    <div className="w-24 h-24 border border-black flex items-center justify-center text-[9px] text-gray-500">
                      QR Code
                    </div>
                  )}
                </div>

                {/* Right: Paid By & Authorized Signatory */}
                <div className="w-[34%] text-right space-y-1">
                  <div className="font-semibold">Paid By:{paymentMethodLabel}</div>
                  <div className="pt-6 font-medium">For, {storeName}</div>
                  <div className="pt-5 font-semibold text-[10px]">Authorised Signature</div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* 2. 80mm THERMAL RECEIPT (Optimized for Roll POS Printers)   */}
          {/* ========================================================= */}
          {currentMode === 'thermal' && (
            <div 
              id="printable-receipt" 
              className="bg-white text-black p-4 rounded-none shadow-2xl w-[320px] max-w-[80mm] font-mono text-[10px] leading-snug border border-dashed border-gray-400 select-text"
              style={{ fontFamily: 'Courier New, monospace' }}
            >
              {/* Thermal Header (Only if hideLetterhead is false) */}
              {!hideLetterhead && (
                <div className="text-center pb-2 border-b border-dashed border-black space-y-0.5">
                  <div className="flex justify-center mb-1">
                    <img src="/logo.webp" alt={storeName} className="h-8 object-contain" />
                  </div>
                  <div className="font-bold text-xs uppercase tracking-wider">{storeName}</div>
                  <div className="text-[9px]">{storeAddress}</div>
                  <div className="text-[9px]">Tel: {storePhone}</div>
                  <div className="text-[9px]">GSTIN: {storeGstin}</div>
                </div>
              )}

              {/* Title bar */}
              <div className="text-center font-bold text-[11px] py-1 border-b border-dashed border-black">
                *** TAX INVOICE ***
              </div>

              {/* Bill & Customer Metadata */}
              <div className="py-2 border-b border-dashed border-black text-[9px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No: {invoice.invoiceNumber || '532'}</span>
                  <span>Date: {formattedBillDate}</span>
                </div>
                <div>Customer: <strong>{customerName}</strong></div>
                {customerPhone && <div>Phone: {customerPhone}</div>}
                <div>Outlet: <strong>{storeName} ({city.name || 'Mandvi'})</strong></div>
              </div>

              {/* Items List (Thermal format without awkward column clipping) */}
              <div className="py-2 border-b border-dashed border-black">
                <div className="flex justify-between font-bold border-b border-black pb-1 mb-1 text-[9px]">
                  <span className="w-[50%]">Item</span>
                  <span className="w-[15%] text-center">Qty</span>
                  <span className="w-[15%] text-right">Rate</span>
                  <span className="w-[20%] text-right">Net</span>
                </div>

                {items.map((item) => (
                  <div key={item.sr} className="py-1 border-b border-gray-200">
                    <div className="font-bold truncate">{item.name}</div>
                    <div className="flex justify-between text-[9px] text-gray-700">
                      <span className="w-[50%] text-[8px] text-gray-500">Tax 18%: ₹{item.taxAmt.toFixed(2)}</span>
                      <span className="w-[15%] text-center">{item.qty}</span>
                      <span className="w-[15%] text-right">₹{item.rate.toFixed(2)}</span>
                      <span className="w-[20%] text-right font-bold">₹{item.netAmt.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculations Breakdown */}
              <div className="py-2 border-b border-dashed border-black space-y-1 text-[9px]">
                <div className="flex justify-between">
                  <span>Gross (Taxable Amt):</span>
                  <span>₹{totalGross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (9.0%):</span>
                  <span>₹{cgstAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (9.0%):</span>
                  <span>₹{sgstAmt.toFixed(2)}</span>
                </div>
                {extraDiscount > 0 && (
                  <div className="flex justify-between font-bold text-red-600">
                    <span>Extra Discount:</span>
                    <span>-₹{extraDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1 border-t border-black text-[12px] font-bold">
                  <span>NET PAYABLE:</span>
                  <span>₹{finalNet}</span>
                </div>
                {dueAmount > 0 && (
                  <div className="pt-1 border-t border-dashed border-gray-400 space-y-0.5 text-[9px]">
                    <div className="flex justify-between">
                      <span>Amount Received:</span>
                      <span className="font-bold">₹{paidAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-600">
                      <span>BALANCE DUE (CREDIT):</span>
                      <span>₹{dueAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <div className="text-[8px] italic pt-0.5 text-gray-600">
                  {wordsText}
                </div>
              </div>

              {/* Dynamic QR Code */}
              <div className="py-2 flex flex-col items-center justify-center border-b border-dashed border-black">
                <div className="text-[9px] font-bold mb-1">[ SCAN & PAY VIA UPI ]</div>
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="UPI QR" className="w-28 h-28 object-contain border border-black p-0.5" />
                )}
                <div className="text-[8px] mt-1 text-gray-600">Paid By: {paymentMethodLabel}</div>
              </div>

              {/* Thermal Terms & Sign */}
              <div className="pt-2 text-center text-[8px] space-y-1 text-gray-600">
                <p>1. Goods once sold will not be taken back.</p>
                <p>2. {jurisdictionText}</p>
                <p className="font-bold pt-2 text-black">For, {storeName}</p>
                <p className="pt-3">Authorized Signature</p>
                <p className="pt-1 text-[7px]">*** THANK YOU FOR VISITING ***</p>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
