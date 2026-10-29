import React, { useState, useEffect, useRef, useMemo } from 'react';
import DataTable from '../../components/DataTable';
import { LayoutGrid, List, Package } from 'lucide-react';
import { productService, billingService } from '../../services/api';

export default function PosBillingView({ selectedStore, onInvoiceCreated }) {
  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cart State
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [discountType, setDiscountType] = useState('NONE'); // NONE | FIXED | PERCENTAGE
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI_QR'); // UPI_QR | CASH | CARD | CREDIT | SPLIT
  const [splitCash, setSplitCash] = useState('');
  const [splitUpi, setSplitUpi] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitCredit, setSplitCredit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('jj_pos_view_mode') || 'grid';
  });

  const handleToggleView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('jj_pos_view_mode', mode);
  };

  const barcodeInputRef = useRef(null);

  // Load products & categories when selectedStore changes or component mounts
  useEffect(() => {
    let active = true;

    const fetchCatalog = async () => {
      try {
        setLoading(true);
        setErrorMsg('');
        const params = { isActive: 'true' };
        if (selectedStore?.id) {
          params.storeId = selectedStore.id;
        }

        const [prodRes, catRes] = await Promise.all([
          productService.getProducts(params),
          productService.getCategories(),
        ]);
        if (active) {
          setProducts(prodRes.data || []);
          setCategories(catRes.data || []);
        }
      } catch (err) {
        if (active) {
          console.error('Failed to load catalog:', err);
          if (err.response?.status === 401) {
            setErrorMsg('Your sign-in expired. Sign out and sign in again.');
          } else {
            setErrorMsg('Can’t reach the server. Check the connection and press Refresh.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCatalog();

  
  return () => {
      active = false;
    };
  }, [selectedStore?.id]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = { isActive: 'true' };
      if (selectedStore?.id) {
        params.storeId = selectedStore.id;
      }

      const [prodRes, catRes] = await Promise.all([
        productService.getProducts(params),
        productService.getCategories(),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load catalog:', err);
      setErrorMsg('Can’t reach the server. Check the connection and press Refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Barcode / SKU quick scan handler (Triggered when barcode scanner sends Enter)
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    // Check if product is already in our loaded list
    const found = products.find(
      (p) => p.barcode?.toLowerCase() === code.toLowerCase() || p.sku?.toLowerCase() === code.toLowerCase()
    );

    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      // Query backend lookup with current store stock
      try {
        const res = await productService.lookupByCode(code, selectedStore?.id);
        if (res.data) {
          addToCart(res.data);
          setBarcodeInput('');
        }
      } catch (err) {
        setErrorMsg(`No product with barcode or SKU "${code}".`);
        setTimeout(() => setErrorMsg(''), 4000);
      }
    }
  };

  // Add to cart with store-specific stock check
  const addToCart = (product) => {
    const availableStock = product.currentStoreStock !== undefined ? product.currentStoreStock : product.stockQuantity;

    if (availableStock <= 0) {
      setErrorMsg(`"${product.name}" is out of stock in ${selectedStore?.city?.name || 'this store'}.`);
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          setErrorMsg(`Only ${availableStock} of "${product.name}" in stock at ${selectedStore?.city?.name || 'this counter'}.`);
          setTimeout(() => setErrorMsg(''), 4000);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const availableStock = item.product.currentStoreStock !== undefined ? item.product.currentStoreStock : item.product.stockQuantity;
            const newQty = item.quantity + delta;
            if (newQty > availableStock) {
              setErrorMsg(`Only ${availableStock} in stock at ${selectedStore?.city?.name || 'this counter'}.`);
              setTimeout(() => setErrorMsg(''), 3000);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountType('NONE');
    setDiscountValue('');
    setCustomer({ name: '', phone: '', email: '' });
    setSplitCash('');
    setSplitUpi('');
    setSplitCard('');
    setSplitCredit('');
  };

  // Financial calculations
  const subtotal = cart.reduce((sum, item) => sum + Number(item.product.sellingPrice) * item.quantity, 0);

  let discountAmount = 0;
  const numDiscount = Number(discountValue) || 0;
  if (discountType === 'FIXED') {
    discountAmount = Math.min(numDiscount, subtotal);
  } else if (discountType === 'PERCENTAGE') {
    const pct = Math.min(Math.max(numDiscount, 0), 100);
    discountAmount = (subtotal * pct) / 100;
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  // 18% GST (9% CGST + 9% SGST)
  const taxAmount = (taxableAmount * 18) / 100;
  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;
  const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

  // Multi-Tender Split Calculation Helpers (Cash, UPI, Card, and Credit / Due)
  const numSplitCash = Number(splitCash) || 0;
  const numSplitUpi = Number(splitUpi) || 0;
  const numSplitCard = Number(splitCard) || 0;
  const numSplitCredit = Number(splitCredit) || 0;
  const splitTotalAllocated = Number((numSplitCash + numSplitUpi + numSplitCard + numSplitCredit).toFixed(2));
  const splitRemaining = Number((grandTotal - splitTotalAllocated).toFixed(2));
  const splitPaidNow = Number((numSplitCash + numSplitUpi + numSplitCard).toFixed(2));

  const handleFillSplitRemaining = (target) => {
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
  };

  const handlePresetSplit = (preset) => {
    const half = Math.floor(grandTotal / 2);
    const remainder = Number((grandTotal - half).toFixed(2));
    if (preset === 'CASH_CREDIT') {
      // Cash + Credit Partial Payment
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
  };

  // Filter products by category & search
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.fragranceNotes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Handle Checkout submission
  const handleCheckout = async () => {
    if (!cart.length) {
      setErrorMsg('Add at least one fragrance before saving the bill.');
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
      if (numSplitCredit > 0 && !customer.name?.trim() && !customer.phone?.trim()) {
        setErrorMsg('Add the customer’s name or phone to record the amount on credit.');
        return;
      }
    } else if (paymentMethod === 'CREDIT') {
      if (!customer.name?.trim() && !customer.phone?.trim()) {
        setErrorMsg('Add the customer’s name or phone to bill on credit.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      const payload = {
        storeId: selectedStore?.id, // Multi-City Store ID
        customerData: (customer.phone || customer.name) ? customer : null,
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
        // Refresh catalog to reflect updated stock levels
        loadCatalog();
        // Notify parent to open Dynamic QR / Invoice modal
        onInvoiceCreated(res.data);
        clearCart();
      }
    } catch (err) {
      console.error('Invoice creation error:', err);
      setErrorMsg(err.response?.data?.message || 'The bill wasn’t saved. Check stock and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cityName = selectedStore?.city?.name || 'this counter';
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
    { id: 'UPI_QR', label: 'UPI QR' },
    { id: 'CASH', label: 'Cash' },
    { id: 'CARD', label: 'Card' },
    { id: 'SPLIT', label: 'Split' },
    { id: 'CREDIT', label: 'On credit' },
  ];

  const splitFields = [
    { key: 'cash', label: 'Cash', value: splitCash, set: setSplitCash },
    { key: 'upi', label: 'UPI QR', value: splitUpi, set: setSplitUpi },
    { key: 'card', label: 'Card', value: splitCard, set: setSplitCard },
    { key: 'credit', label: 'On credit', value: splitCredit, set: setSplitCredit },
  ];

  const fieldClass =
    'w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-amber-500 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none';

const posColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Fragrance',
      sortAccessor: (prod) => prod.name,
      sortable: true,
      render: (_, prod) => (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {prod.imageUrl ? (
              <img
                src={prod.imageUrl}
                alt={prod.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.pos-tbl-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <Package className={`pos-tbl-fallback w-5 h-5 text-slate-300 ${prod.imageUrl ? 'hidden' : ''}`} />
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-sm font-medium text-slate-900 truncate">{prod.name}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {prod.concentration ? prod.concentration.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'Perfume'} · {prod.volumeMl} ml
            </div>
            {prod.fragranceNotes && (
              <div className="text-[11px] text-slate-600 italic font-serif truncate max-w-xs mt-0.5">
                {prod.fragranceNotes.split('|').map((n) => n.trim()).join(' · ')}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU / Barcode',
      sortAccessor: (prod) => prod.sku,
      sortable: true,
      className: 'tabular-nums font-mono',
      render: (_, prod) => (
        <div>
          <span className="text-slate-800 font-medium">{prod.sku}</span>
          {prod.barcode && <span className="block text-[11px] text-slate-400 font-light">{prod.barcode}</span>}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortAccessor: (prod) => prod.category?.name || '',
      sortable: true,
      render: (_, prod) => (
        <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700 text-[11px] font-medium">
          {prod.category?.name || 'Fragrance'}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Counter Stock',
      sortAccessor: (prod) => {
        return prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
      },
      sortable: true,
      render: (_, prod) => {
        const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
        const isOutOfStock = storeStock <= 0;
        return (
          <div className="text-xs">
            {isOutOfStock ? (
              <>
                <span className="text-rose-700 font-semibold">Out of stock here</span>
                <span className="block text-[11px] text-slate-400">{prod.stockQuantity} across other counters</span>
              </>
            ) : (
              <>
                <span className={`font-semibold ${storeStock <= 5 ? 'text-amber-700' : 'text-slate-800'}`}>
                  {storeStock} in {cityName}
                </span>
                <span className="block text-[11px] text-slate-400">{prod.stockQuantity} total in chain</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'sellingPrice',
      header: 'Price',
      sortAccessor: (prod) => Number(prod.sellingPrice || 0),
      sortable: true,
      align: 'right',
      className: 'tabular-nums whitespace-nowrap',
      render: (val) => (
        <div>
          <span className="block text-sm font-semibold text-slate-900">
            ₹{Number(val).toLocaleString('en-IN')}
          </span>
          <span className="block text-[10px] text-slate-400 font-light">+ 18% GST</span>
        </div>
      ),
    },
    {
      key: 'inCart',
      header: 'In Bill',
      sortable: false,
      align: 'center',
      render: (_, prod) => {
        const inCartItem = cart.find((i) => i.product.id === prod.id);
        if (!inCartItem) return <span className="text-slate-300 text-xs">—</span>;
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-2xs">
            × {inCartItem.quantity}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: 'Action',
      sortable: false,
      align: 'center',
      render: (_, prod) => {
        const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
        const isOutOfStock = storeStock <= 0;
        return (
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              addToCart(prod);
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
            }`}
          >
            {isOutOfStock ? 'Sold out' : '+ Add'}
          </button>
        );
      },
    },
  ], [cart, cityName]);

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-10 gap-y-8">
        {/* Catalog */}
        <section className="lg:col-span-7 xl:col-span-8 min-w-0">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2 max-w-xl">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              aria-label="Scan a barcode or type a SKU"
              placeholder="Scan a barcode or type a SKU"
              className={`${fieldClass} py-2`}
            />
            <button type="submit" className="px-4 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-800">
              Add
            </button>
          </form>

          {errorMsg && (
            <p role="alert" className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 max-w-xl">
              {errorMsg}
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200">
            <div className="flex gap-5 overflow-x-auto">
              {[{ id: 'ALL', name: 'All' }, ...categories].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`pb-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
                    selectedCategory === cat.id
                      ? 'border-amber-500 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pb-2">
              {/* Grid / List toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleToggleView('grid')}
                  title="Grid View"
                  className={`p-1 rounded-md text-xs transition cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleView('list')}
                  title="List View"
                  className={`p-1 rounded-md text-xs transition cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-amber-600" />
                </button>
              </div>

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search fragrances"
                placeholder="Search name, SKU or notes"
                className={`${fieldClass} sm:w-48`}
              />
              <button onClick={loadCatalog} className="text-sm text-slate-500 hover:text-slate-900 underline underline-offset-2 whitespace-nowrap">
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {loading && products.length === 0 ? (
            <p className="py-16 text-sm text-slate-500">Loading what’s on the shelf at {cityName}…</p>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-slate-600">
              <p className="font-medium">Nothing matches that search.</p>
              <p className="text-sm text-slate-500 mt-1">Try part of the name, or clear the filter above.</p>
            </div>
          ) : viewMode === 'grid' ? (
            /* POS GRID VIEW */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 py-1">
              {filteredProducts.map((prod) => {
                const inCartItem = cart.find((i) => i.product.id === prod.id);
                const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
                const isOutOfStock = storeStock <= 0;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(prod)}
                    className={`group text-left bg-white rounded-xl border transition-all flex flex-col overflow-hidden relative ${
                      isOutOfStock
                        ? 'opacity-55 border-slate-200 cursor-not-allowed'
                        : inCartItem
                        ? 'border-amber-500 ring-2 ring-amber-400/30 shadow-sm cursor-pointer hover:border-amber-600'
                        : 'border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    {/* Fragrance Image */}
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 w-full overflow-hidden flex items-center justify-center">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.pos-grid-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`pos-grid-fallback flex flex-col items-center justify-center text-slate-300 ${prod.imageUrl ? 'hidden' : ''}`}>
                        <Package className="w-7 h-7 stroke-[1.25] text-slate-300" />
                      </div>

                      {/* In-Cart Quantity Badge */}
                      {inCartItem && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-white font-bold text-xs px-2 py-0.5 rounded-full shadow-sm">
                          × {inCartItem.quantity}
                        </span>
                      )}

                      {/* Stock Badge */}
                      <span className={`absolute bottom-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-xs backdrop-blur-md ${
                        isOutOfStock
                          ? 'bg-rose-500/90 text-white'
                          : storeStock <= 5
                          ? 'bg-amber-500/90 text-white font-bold'
                          : 'bg-slate-900/80 text-emerald-300'
                      }`}>
                        {isOutOfStock ? 'Out' : `${storeStock} at ${cityName}`}
                      </span>
                    </div>

                    {/* Card Details */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="font-serif font-medium text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-amber-700 transition-colors">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {prod.volumeMl}ml · {prod.sku}
                        </div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-900 tabular-nums">
                          ₹{Number(prod.sellingPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-amber-700 font-medium">
                          + Add
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* POS LIST VIEW */
            <DataTable
              columns={posColumns}
              data={filteredProducts}
              loading={loading}
              searchable={false}
              pagination={true}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50]}
              emptyIcon={Package}
              emptyMessage="Nothing matches that search"
              emptySubtext="Try part of the name, or clear the filter above."
              initialSort={{ key: 'name', direction: 'asc' }}
              onRowClick={(prod) => {
                const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
                if (storeStock > 0) addToCart(prod);
              }}
              rowClassName={(prod) => {
                const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
                const inCart = cart.some((i) => i.product.id === prod.id);
                if (storeStock <= 0) return 'opacity-55 cursor-not-allowed bg-slate-50/50';
                if (inCart) return 'bg-amber-50/30';
                return '';
              }}
            />
          )}
        </section>

        {/* Bill slip */}
        <aside className="lg:col-span-5 xl:col-span-4">
          <div className="bill-slip px-5 pt-5 pb-6 mb-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-2xl font-semibold text-slate-900">New bill</h2>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-sm text-slate-500 hover:text-rose-700 underline underline-offset-2">
                  Clear
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {selectedStore?.name}{selectedStore?.city?.name ? `, ${selectedStore.city.name}` : ''} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>

            <div className="grid grid-cols-2 gap-2 mt-4">
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
              <p className="py-6 text-sm text-slate-500">
                Nothing on this bill yet. Tap a fragrance or scan its barcode.
              </p>
            ) : (
              <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <li key={item.product.id} className="grid grid-cols-[1fr_auto] gap-x-3 text-sm">
                    <span className="font-serif text-base text-slate-900 leading-tight">{item.product.name}</span>
                    <span className="font-medium text-slate-900 text-right">
                      ₹{(Number(item.product.sellingPrice) * item.quantity).toLocaleString('en-IN')}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 mt-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        aria-label={`One less ${item.product.name}`}
                        className="w-6 h-6 rounded border border-slate-300 hover:bg-slate-100 leading-none"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-slate-900 font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        aria-label={`One more ${item.product.name}`}
                        className="w-6 h-6 rounded border border-slate-300 hover:bg-slate-100 leading-none"
                      >
                        +
                      </button>
                      <span className="ml-2">× ₹{Number(item.product.sellingPrice).toLocaleString('en-IN')}</span>
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xs text-slate-500 hover:text-rose-700 underline underline-offset-2 justify-self-end self-end"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="slip-rule my-4" />

            {/* Discount */}
            <fieldset>
              <legend className="sr-only">Discount</legend>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Discount</span>
                <div className="flex gap-3">
                  {[
                    { id: 'NONE', label: 'None' },
                    { id: 'FIXED', label: '₹ off' },
                    { id: 'PERCENTAGE', label: '% off' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDiscountType(opt.id)}
                      aria-pressed={discountType === opt.id}
                      className={`${discountType === opt.id ? 'text-amber-700 font-semibold underline underline-offset-4' : 'text-slate-500 hover:text-slate-900'}`}
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

            <dl className="mt-4 space-y-1 text-sm text-slate-600">
              <div className="flex justify-between"><dt>Subtotal</dt><dd className="text-slate-900">{inr(subtotal)}</dd></div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-amber-700"><dt>Discount</dt><dd>− {inr(discountAmount)}</dd></div>
              )}
              <div className="flex justify-between"><dt>CGST 9% + SGST 9%</dt><dd className="text-slate-900">{inr(taxAmount)}</dd></div>
            </dl>

            <div className="slip-rule my-3" />
            <div className="flex items-baseline justify-between">
              <span className="font-serif text-lg text-slate-900">To pay</span>
              <span className="font-serif text-3xl font-semibold text-slate-900">{inr(grandTotal)}</span>
            </div>

            {/* Payment */}
            <fieldset className="mt-5">
              <legend className="text-sm text-slate-700 mb-1.5">Paid by</legend>
              <div className="flex flex-wrap gap-1.5" role="radiogroup">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.id}
                    role="radio"
                    aria-checked={paymentMethod === opt.id}
                    onClick={() => {
                      setPaymentMethod(opt.id);
                      if (opt.id === 'SPLIT' && !splitCash && !splitCredit && !splitUpi && !splitCard) {
                        handlePresetSplit('CASH_CREDIT');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-md border text-sm transition-colors ${
                      paymentMethod === opt.id
                        ? 'bg-amber-500 border-amber-500 text-white font-semibold'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {paymentMethod === 'SPLIT' && (
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                  <span>Quick split:</span>
                  <button type="button" onClick={() => handlePresetSplit('CASH_CREDIT')} className="underline underline-offset-2 hover:text-slate-900">cash + credit</button>
                  <button type="button" onClick={() => handlePresetSplit('CASH_UPI')} className="underline underline-offset-2 hover:text-slate-900">cash + UPI</button>
                  <button type="button" onClick={() => handlePresetSplit('CASH_CARD')} className="underline underline-offset-2 hover:text-slate-900">cash + card</button>
                  <button type="button" onClick={() => handlePresetSplit('CLEAR')} className="ml-auto underline underline-offset-2 hover:text-slate-900">reset</button>
                </div>

                {splitFields.map((f) => (
                  <div key={f.key} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2">
                    <label htmlFor={`split-${f.key}`} className="text-slate-700">{f.label}</label>
                    <input
                      id={`split-${f.key}`}
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
                      className="text-xs text-amber-700 underline underline-offset-2 whitespace-nowrap"
                    >
                      Use rest
                    </button>
                  </div>
                ))}

                <p className={`text-sm ${Math.abs(splitRemaining) <= 0.01 && splitTotalAllocated > 0 ? 'text-amber-700' : splitRemaining < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                  {Math.abs(splitRemaining) <= 0.01 && splitTotalAllocated > 0
                    ? `Adds up to ${inr(grandTotal)}.`
                    : splitRemaining > 0
                    ? `${inr(splitRemaining)} left to assign of ${inr(grandTotal)}.`
                    : `${inr(Math.abs(splitRemaining))} more than the bill total.`}
                </p>
              </div>
            )}

            {(paymentMethod === 'CREDIT' || (paymentMethod === 'SPLIT' && numSplitCredit > 0)) && (
              <p className="mt-3 text-sm text-slate-600 border-l-2 border-rose-300 pl-3">
                {inr(paymentMethod === 'CREDIT' ? grandTotal : numSplitCredit)} will be added to this customer’s account as due. Add their name or phone above so it can be found later.
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkoutBlocked}
              className={`mt-5 w-full py-3 rounded-md font-semibold text-base transition-colors ${
                checkoutBlocked
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {checkoutLabel}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
