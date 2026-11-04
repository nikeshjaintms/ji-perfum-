import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { billingService } from '../services/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  // Cart state persisted in sessionStorage or memory
  const [cart, setCart] = useState(() => {
    try {
      const saved = sessionStorage.getItem('jj_active_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customer, setCustomer] = useState(() => {
    try {
      const saved = sessionStorage.getItem('jj_active_customer');
      return saved ? JSON.parse(saved) : { name: '', phone: '', email: '' };
    } catch {
      return { name: '', phone: '', email: '' };
    }
  });

  const [discountType, setDiscountType] = useState('NONE'); // NONE | FIXED | PERCENTAGE
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI_QR'); // UPI_QR | CASH | CARD | SPLIT | CREDIT

  const [splitCash, setSplitCash] = useState('');
  const [splitUpi, setSplitUpi] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitCredit, setSplitCredit] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Persist cart to session storage so page reloads or tab switching never lose current bill
  useEffect(() => {
    try {
      sessionStorage.setItem('jj_active_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      sessionStorage.setItem('jj_active_customer', JSON.stringify(customer));
    } catch {}
  }, [customer]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => {
    setIsCartOpen(false);
    setErrorMsg('');
  }, []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountType('NONE');
    setDiscountValue('');
    setCustomer({ name: '', phone: '', email: '' });
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
    setSplitCredit('');
    setErrorMsg('');
    try {
      sessionStorage.removeItem('jj_active_cart');
      sessionStorage.removeItem('jj_active_customer');
    } catch {}
  }, []);

  const addToCart = useCallback((product, storeStock = null) => {
    const availableStock = storeStock !== null && storeStock !== undefined
      ? storeStock
      : (product.currentStoreStock !== undefined ? product.currentStoreStock : product.stockQuantity);

    if (availableStock <= 0) {
      const msg = `"${product.name}" is out of stock in this store.`;
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
      return { success: false, message: msg };
    }

    let result = { success: true };
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          result = {
            success: false,
            message: `Only ${availableStock} of "${product.name}" in stock at this counter.`,
          };
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });

    if (!result.success && result.message) {
      setErrorMsg(result.message);
      setTimeout(() => setErrorMsg(''), 4000);
    }

    return result;
  }, []);

  const updateQuantity = useCallback((productId, delta, maxStock = null) => {
    let result = { success: true };
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const availableStock = maxStock !== null && maxStock !== undefined
              ? maxStock
              : (item.product.currentStoreStock !== undefined ? item.product.currentStoreStock : item.product.stockQuantity);
            const newQty = item.quantity + delta;
            if (newQty > availableStock) {
              result = {
                success: false,
                message: `Only ${availableStock} of "${item.product.name}" in stock at this counter.`,
              };
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );

    if (!result.success && result.message) {
      setErrorMsg(result.message);
      setTimeout(() => setErrorMsg(''), 4000);
    }

    return result;
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  // Financial calculations
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.sellingPrice) * item.quantity, 0),
    [cart]
  );

  const discountAmount = useMemo(() => {
    const numDiscount = Number(discountValue) || 0;
    if (discountType === 'FIXED') {
      return Math.min(numDiscount, subtotal);
    } else if (discountType === 'PERCENTAGE') {
      const pct = Math.min(Math.max(numDiscount, 0), 100);
      return (subtotal * pct) / 100;
    }
    return 0;
  }, [discountType, discountValue, subtotal]);

  const taxableAmount = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);
  const taxAmount = useMemo(() => (taxableAmount * 18) / 100, [taxableAmount]);
  const cgstAmount = useMemo(() => taxAmount / 2, [taxAmount]);
  const sgstAmount = useMemo(() => taxAmount / 2, [taxAmount]);
  const grandTotal = useMemo(() => Number((taxableAmount + taxAmount).toFixed(2)), [taxableAmount, taxAmount]);

  // Multi-Tender Split Calculation Helpers
  const numSplitCash = Number(splitCash) || 0;
  const numSplitUpi = Number(splitUpi) || 0;
  const numSplitCard = Number(splitCard) || 0;
  const numSplitCredit = Number(splitCredit) || 0;
  const splitTotalAllocated = Number((numSplitCash + numSplitUpi + numSplitCard + numSplitCredit).toFixed(2));
  const splitRemaining = Number((grandTotal - splitTotalAllocated).toFixed(2));
  const splitPaidNow = Number((numSplitCash + numSplitUpi + numSplitCard).toFixed(2));

  const handleFillSplitRemaining = useCallback(
    (target) => {
      const others =
        target === 'cash' ? numSplitUpi + numSplitCard + numSplitCredit :
        target === 'upi' ? numSplitCash + numSplitCard + numSplitCredit :
        target === 'card' ? numSplitCash + numSplitUpi + numSplitCredit :
        numSplitCash + numSplitUpi + numSplitCard;
      const remaining = Math.max(0, Number((grandTotal - others).toFixed(2)));
      if (target === 'cash') setSplitCash(remaining > 0 ? String(remaining) : '');
      if (target === 'upi') setSplitUpi(remaining > 0 ? String(remaining) : '');
      if (target === 'card') setSplitCard(remaining > 0 ? String(remaining) : '');
      if (target === 'credit') setSplitCredit(remaining > 0 ? String(remaining) : '');
    },
    [numSplitCash, numSplitUpi, numSplitCard, numSplitCredit, grandTotal]
  );

  const handlePresetSplit = useCallback(
    (preset) => {
      const half = Math.floor(grandTotal / 2);
      const remainder = Number((grandTotal - half).toFixed(2));
      if (preset === 'CASH_CREDIT') {
        setSplitCash(String(half));
        setSplitCredit(String(remainder));
        setSplitUpi('');
        setSplitCard('');
      } else if (preset === 'CASH_UPI') {
        setSplitCash(String(half));
        setSplitUpi(String(remainder));
        setSplitCard('');
        setSplitCredit('');
      } else if (preset === 'CASH_CARD') {
        setSplitCash(String(half));
        setSplitCard(String(remainder));
        setSplitUpi('');
        setSplitCredit('');
      } else if (preset === 'FULL_CREDIT') {
        setSplitCredit(String(grandTotal));
        setSplitCash('');
        setSplitUpi('');
        setSplitCard('');
      } else if (preset === 'CLEAR') {
        setSplitCash('');
        setSplitUpi('');
        setSplitCard('');
        setSplitCredit('');
      }
    },
    [grandTotal]
  );

  const handleCheckout = useCallback(
    async (selectedStore, onInvoiceCreated) => {
      if (!cart.length) {
        setErrorMsg('Add at least one fragrance before saving the bill.');
        return;
      }

      // Customer Name & Phone Validation
      const trimmedName = (customer.name || '').trim();
      if (!trimmedName) {
        setErrorMsg('Please enter customer name.');
        return;
      }
      if (trimmedName.length < 2) {
        setErrorMsg('Customer name must be at least 2 characters.');
        return;
      }
      if (!/^[a-zA-Z\s'.\-]+$/.test(trimmedName)) {
        setErrorMsg('Customer name should only contain letters and spaces.');
        return;
      }

      const rawDigits = (customer.phone || '').replace(/\D/g, '');
      let finalPhone = rawDigits;
      if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
        finalPhone = rawDigits.slice(1);
      } else if (rawDigits.length === 12 && rawDigits.startsWith('91')) {
        finalPhone = rawDigits.slice(2);
      }

      if (!finalPhone) {
        setErrorMsg('Please enter customer mobile number for WhatsApp bill.');
        return;
      }
      if (finalPhone.length !== 10 || !/^[6-9]/.test(finalPhone)) {
        setErrorMsg('Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
        return;
      }

      if (paymentMethod === 'SPLIT') {
        if (Math.abs(splitRemaining) > 0.05) {
          setErrorMsg(`The split has to add up to the bill total. ₹${splitRemaining.toFixed(2)} is still unassigned.`);
          return;
        }
        if (splitTotalAllocated <= 0) {
          setErrorMsg('Enter the amount for each way the customer is paying.');
          return;
        }
      }

      try {
        setIsSubmitting(true);
        setErrorMsg('');

        const payload = {
          storeId: selectedStore?.id,
          customerData: {
            name: trimmedName,
            phone: finalPhone,
            email: customer.email?.trim() || null,
          },
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          discountType,
          discountValue: Number(discountValue) || 0,
          paymentMethod,
          splitDetails: paymentMethod === 'SPLIT' ? {
            cashAmount: numSplitCash,
            upiAmount: numSplitUpi,
            cardAmount: numSplitCard,
            creditAmount: numSplitCredit,
          } : null,
          isDirectPaid: paymentMethod === 'CASH' || (paymentMethod === 'SPLIT' && numSplitUpi === 0 && numSplitCredit === 0),
          notes: `POS Checkout - ${selectedStore?.city?.name || 'Counter'} - ${new Date().toLocaleDateString()}`,
        };

        const res = await billingService.createInvoice(payload);
        if (res.success && res.data) {
          // Broadcast catalog refresh event so any catalog components update stock
          window.dispatchEvent(new CustomEvent('catalog:refresh'));
          clearCart();
          setIsCartOpen(false);
          if (onInvoiceCreated) {
            onInvoiceCreated(res.data);
          }
        }
      } catch (err) {
        console.error('Invoice creation error:', err);
        setErrorMsg(err.response?.data?.message || 'The bill wasn’t saved. Check stock and try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      cart,
      paymentMethod,
      splitRemaining,
      splitTotalAllocated,
      numSplitCredit,
      customer,
      discountType,
      discountValue,
      numSplitCash,
      numSplitUpi,
      numSplitCard,
      clearCart,
    ]
  );

  const value = {
    cart,
    setCart,
    cartCount,
    isCartOpen,
    setIsCartOpen,
    openCart,
    closeCart,
    toggleCart,
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
    setErrorMsg,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    cgstAmount,
    sgstAmount,
    grandTotal,
    numSplitCash,
    numSplitUpi,
    numSplitCard,
    numSplitCredit,
    splitTotalAllocated,
    splitRemaining,
    splitPaidNow,
    handleFillSplitRemaining,
    handlePresetSplit,
    handleCheckout,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

