import React, { useEffect } from 'react';
import {
  ShoppingCart,
  X,
  Trash2,
  QrCode,
  Banknote,
  CreditCard,
  Layers,
  BookOpen,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function NewBillModal({
  isOpen,
  onClose,
  selectedStore,
  onInvoiceCreated,
  onNavigateToBilling,
}) {
  const {
    cart,
    cartCount,
    customer,
    setCustomer,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    paymentMethod,
    setPaymentMethod,
    splitCash,
    setSplitCash,
    splitUpi,
    setSplitUpi,
    splitCard,
    setSplitCard,
    splitCredit,
    setSplitCredit,
    isSubmitting,
    errorMsg,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    discountAmount,
    taxAmount,
    grandTotal,
    numSplitCredit,
    splitTotalAllocated,
    splitRemaining,
    splitPaidNow,
    handleFillSplitRemaining,
    handlePresetSplit,
    handleCheckout,
  } = useCart();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const checkoutBlocked =
    isSubmitting ||
    cart.length === 0 ||
    (paymentMethod === 'SPLIT' && (Math.abs(splitRemaining) > 0.05 || splitTotalAllocated <= 0));

  const checkoutLabel = (() => {
    if (isSubmitting) return 'Saving bill…';
    if (paymentMethod === 'UPI_QR') return `Show QR · ${inr(grandTotal)}`;
    if (paymentMethod === 'CREDIT') return `Save on credit · ${inr(grandTotal)} due`;
    if (paymentMethod === 'SPLIT') {
      if (Math.abs(splitRemaining) > 0.05 || splitTotalAllocated <= 0) {
        return splitRemaining > 0 ? `${inr(splitRemaining)} still to assign` : `${inr(Math.abs(splitRemaining))} over the total`;
      }
      return numSplitCredit > 0
        ? `Save bill · ${inr(splitPaidNow)} paid, ${inr(numSplitCredit)} due`
        : `Save bill · ${inr(grandTotal)}`;
    }
    return `Save bill · ${inr(grandTotal)}`;
  })();

  const paymentOptions = [
    { id: 'UPI_QR', label: 'UPI QR', icon: QrCode },
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'CARD', label: 'Card', icon: CreditCard },
    { id: 'SPLIT', label: 'Split', icon: Layers },
    { id: 'CREDIT', label: 'On credit', icon: BookOpen },
  ];

  const splitFields = [
    { key: 'cash', label: 'Cash', value: splitCash, set: setSplitCash },
    { key: 'upi', label: 'UPI QR', value: splitUpi, set: setSplitUpi },
    { key: 'card', label: 'Card', value: splitCard, set: setSplitCard },
    { key: 'credit', label: 'On credit', value: splitCredit, set: setSplitCredit },
  ];

  const fieldClass =
    'w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-amber-500 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none';

  const onSubmit = () => {
    handleCheckout(selectedStore, onInvoiceCreated);
  };

  return (
    <div
      id="new-bill-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target.id === 'new-bill-modal-backdrop') onClose();
      }}
    >
      <div
        id="new-bill-modal-panel"
        className="bg-paper border border-slate-300 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl p-4 sm:p-6 my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-amber-500/10 text-amber-800 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-slate-900 leading-tight">
                New Bill
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedStore?.name || 'Counter'}{selectedStore?.city?.name ? `, ${selectedStore.city.name}` : ''} · {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-new-bill-modal-btn"
            onClick={onClose}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg transition cursor-pointer flex items-center space-x-1 text-xs font-medium border border-slate-200"
            title="Close bill"
          >
            <span>Close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bill Slip Content */}
        <div className="bill-slip px-1 pt-1 pb-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900">New bill</h2>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded transition cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-600" />
                <span>Clear</span>
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {selectedStore?.name}{selectedStore?.city?.name ? `, ${selectedStore.city.name}` : ''} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            <input
              type="text"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              aria-label="Customer name"
              placeholder="Customer name"
              className={fieldClass}
            />
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              aria-label="Customer phone"
              placeholder="Phone"
              className={fieldClass}
            />
          </div>

          <div className="slip-rule my-4" />

          {cart.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-slate-500">
                Nothing on this bill yet. Tap a fragrance or scan its barcode.
              </p>
              {onNavigateToBilling && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToBilling();
                  }}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Browse Fragrance Catalog</span>
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-1 no-scrollbar sm:overflow-y-auto">
              {cart.map((item) => (
                <li key={item.product.id} className="grid grid-cols-[1fr_auto] gap-x-3 text-sm">
                  <span className="font-serif text-sm sm:text-base text-slate-900 leading-tight">
                    {item.product.name}
                  </span>
                  <span className="font-medium text-slate-900 text-right tabular-nums whitespace-nowrap">
                    ₹{(Number(item.product.sellingPrice) * item.quantity).toLocaleString('en-IN')}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 mt-1 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, -1)}
                      aria-label={`One less ${item.product.name}`}
                      className="w-6 h-6 rounded border border-slate-300 hover:bg-slate-100 leading-none cursor-pointer flex items-center justify-center font-medium shrink-0"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-slate-900 font-medium tabular-nums shrink-0">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={item.quantity >= (item.product.currentStoreStock !== undefined ? item.product.currentStoreStock : item.product.stockQuantity)}
                      onClick={() => {
                        const maxStock = item.product.currentStoreStock !== undefined ? item.product.currentStoreStock : item.product.stockQuantity;
                        updateQuantity(item.product.id, 1, maxStock);
                      }}
                      aria-label={`One more ${item.product.name}`}
                      title={item.quantity >= (item.product.currentStoreStock !== undefined ? item.product.currentStoreStock : item.product.stockQuantity) ? 'Max available stock reached' : `One more ${item.product.name}`}
                      className="w-6 h-6 rounded border border-slate-300 hover:bg-slate-100 leading-none cursor-pointer flex items-center justify-center font-medium shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                    <span className="ml-2 text-xs tabular-nums whitespace-nowrap">
                      × ₹{Number(item.product.sellingPrice).toLocaleString('en-IN')}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product.id)}
                    title={`Remove ${item.product.name}`}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 justify-self-end self-center transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="slip-rule my-4" />

          {/* Discount */}
          <fieldset>
            <legend className="sr-only">Discount</legend>
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-700">Discount</span>
              <div className="flex gap-2 sm:gap-3 whitespace-nowrap">
                {[
                  { id: 'NONE', label: 'None' },
                  { id: 'FIXED', label: '₹ off' },
                  { id: 'PERCENTAGE', label: '% off' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDiscountType(opt.id)}
                    aria-pressed={discountType === opt.id}
                    className={`cursor-pointer whitespace-nowrap ${discountType === opt.id ? 'text-amber-700 font-semibold underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {discountType !== 'NONE' && (
              <input
                type="number"
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                aria-label={discountType === 'FIXED' ? 'Discount in rupees' : 'Discount in percent'}
                placeholder={discountType === 'FIXED' ? 'Amount in ₹' : 'Percent'}
                className={`${fieldClass} mt-2`}
              />
            )}
          </fieldset>

          <dl className="mt-4 space-y-1 text-xs sm:text-sm text-slate-600">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="text-slate-900 tabular-nums whitespace-nowrap">{inr(subtotal)}</dd></div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-amber-700"><dt>Discount</dt><dd className="tabular-nums whitespace-nowrap">− {inr(discountAmount)}</dd></div>
            )}
            <div className="flex justify-between"><dt>CGST 9% + SGST 9%</dt><dd className="text-slate-900 tabular-nums whitespace-nowrap">{inr(taxAmount)}</dd></div>
          </dl>

          <div className="slip-rule my-3" />
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-base sm:text-lg text-slate-900">To pay</span>
            <span className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 tabular-nums whitespace-nowrap">{inr(grandTotal)}</span>
          </div>

          {/* Payment Options */}
          <fieldset className="mt-4 sm:mt-5">
            <legend className="text-xs sm:text-sm text-slate-700 mb-1.5">Paid by</legend>
            <div className="flex flex-wrap gap-1.5" role="radiogroup">
              {paymentOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === opt.id}
                    onClick={() => {
                      setPaymentMethod(opt.id);
                      if (opt.id === 'SPLIT' && !splitCash && !splitCredit && !splitUpi && !splitCard) {
                        handlePresetSplit('CASH_CREDIT');
                      }
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md border text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      paymentMethod === opt.id
                        ? 'bg-amber-500 border-amber-500 text-white font-semibold shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${paymentMethod === opt.id ? 'text-white' : 'text-slate-500'}`} />
                    <span className="whitespace-nowrap">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Split Payment Section */}
          {paymentMethod === 'SPLIT' && (
            <div className="mt-4 space-y-3 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1 text-slate-500">
                <span className="whitespace-nowrap">Quick split:</span>
                <button type="button" onClick={() => handlePresetSplit('CASH_CREDIT')} className="underline underline-offset-2 hover:text-slate-900 cursor-pointer whitespace-nowrap">cash + credit</button>
                <button type="button" onClick={() => handlePresetSplit('CASH_UPI')} className="underline underline-offset-2 hover:text-slate-900 cursor-pointer whitespace-nowrap">cash + UPI</button>
                <button type="button" onClick={() => handlePresetSplit('CASH_CARD')} className="underline underline-offset-2 hover:text-slate-900 cursor-pointer whitespace-nowrap">cash + card</button>
                <button type="button" onClick={() => handlePresetSplit('CLEAR')} className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 cursor-pointer whitespace-nowrap"><RotateCcw className="w-3 h-3 text-slate-400" /><span>reset</span></button>
              </div>

              {splitFields.map((f) => (
                <div key={f.key} className="grid grid-cols-[4.5rem_1fr_auto] sm:grid-cols-[5.5rem_1fr_auto] items-center gap-2">
                  <label htmlFor={`split-${f.key}-modal`} className="text-slate-700 text-xs sm:text-sm">{f.label}</label>
                  <input
                    id={`split-${f.key}-modal`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder="0.00"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => handleFillSplitRemaining(f.key)}
                    className="text-xs text-amber-700 underline underline-offset-2 whitespace-nowrap cursor-pointer"
                  >
                    Use rest
                  </button>
                </div>
              ))}

              <p className={`text-xs sm:text-sm ${Math.abs(splitRemaining) <= 0.01 && splitTotalAllocated > 0 ? 'text-amber-700' : splitRemaining < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                {Math.abs(splitRemaining) <= 0.01 && splitTotalAllocated > 0
                  ? `Adds up to ${inr(grandTotal)}.`
                  : splitRemaining > 0
                  ? `${inr(splitRemaining)} left to assign of ${inr(grandTotal)}.`
                  : `${inr(Math.abs(splitRemaining))} more than the bill total.`}
              </p>
            </div>
          )}

          {(paymentMethod === 'CREDIT' || (paymentMethod === 'SPLIT' && numSplitCredit > 0)) && (
            <p className="mt-3 text-xs sm:text-sm text-slate-600 border-l-2 border-rose-300 pl-3">
              {inr(paymentMethod === 'CREDIT' ? grandTotal : numSplitCredit)} will be added to this customer’s account as due. Add their name or phone above so it can be found later.
            </p>
          )}

          {errorMsg && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={checkoutBlocked}
            className={`mt-5 w-full py-2.5 sm:py-3 rounded-md font-semibold text-sm sm:text-base transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              checkoutBlocked
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin text-white" />}
            <span>{checkoutLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

