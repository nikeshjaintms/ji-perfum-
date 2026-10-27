import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Sparkles, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Percent,
  RefreshCw,
  ShoppingBag,
  MapPin,
  Layers,
  Zap,
  Check,
  BookOpen
} from 'lucide-react';
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
            setErrorMsg('Authentication updating. Click retry or switch role above.');
          } else {
            setErrorMsg('Failed to connect to backend server. Make sure backend is running.');
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
      setErrorMsg('Failed to connect to backend server. Make sure backend is running.');
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
        setErrorMsg(`Product with barcode/SKU "${code}" not found.`);
        setTimeout(() => setErrorMsg(''), 4000);
      }
    }
  };

  // Add to cart with store-specific stock check
  const addToCart = (product) => {
    const availableStock = product.currentStoreStock !== undefined ? product.currentStoreStock : product.stockQuantity;

    if (availableStock <= 0) {
      setErrorMsg(`Cannot add "${product.name}": Out of stock in ${selectedStore?.city?.name || 'this store'}.`);
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          setErrorMsg(`Maximum stock available in ${selectedStore?.city?.name || 'store'} for "${product.name}" is ${availableStock}.`);
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
              setErrorMsg(`Only ${availableStock} units available in ${selectedStore?.city?.name || 'store'}.`);
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
      setErrorMsg('Cart is empty. Please select products to bill.');
      return;
    }

    if (paymentMethod === 'SPLIT') {
      if (Math.abs(splitRemaining) > 0.05) {
        setErrorMsg(`Split payment amounts must equal Grand Total. Remaining to balance: ₹${splitRemaining.toFixed(2)}`);
        return;
      }
      if (splitTotalAllocated <= 0) {
        setErrorMsg('Please enter valid split tender amounts.');
        return;
      }
      if (numSplitCredit > 0 && !customer.name?.trim() && !customer.phone?.trim()) {
        setErrorMsg('Customer Name or Phone is required to record Customer Credit / Due balance.');
        return;
      }
    } else if (paymentMethod === 'CREDIT') {
      if (!customer.name?.trim() && !customer.phone?.trim()) {
        setErrorMsg('Customer Name or Phone is required for Credit / Khata billing.');
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
      setErrorMsg(err.response?.data?.message || 'Failed to generate invoice. Please check stock and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* City Banner & Fast Scanner Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        
        {/* Fast Barcode / SKU Scanner Form */}
        <form onSubmit={handleBarcodeSubmit} className="w-full md:w-auto flex-1 max-w-xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-600">
              <Barcode className="w-5 h-5" />
            </div>
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan barcode or type SKU (e.g. 890123456001 or JJ-OUD-100)..."
              className="w-full pl-11 pr-24 py-2.5 bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all font-mono shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-slate-100 hover:bg-amber-100 text-slate-800 hover:text-amber-900 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-semibold transition"
            >
              Add Item
            </button>
          </div>
        </form>

        {/* Global Alert / Status Bar */}
        {errorMsg && (
          <div className="w-full md:w-auto bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs font-medium animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Current Active Outlet Info */}
        <div className="hidden md:flex items-center space-x-3 text-xs text-slate-500">
          <div className="flex items-center space-x-2.5 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
            <div>
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold block leading-none">Boutique Counter</span>
              <span className="font-semibold text-slate-900 text-xs">{selectedStore?.name} ({selectedStore?.city?.name})</span>
            </div>
          </div>
          
          <button 
            onClick={loadCatalog} 
            className="p-2.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl shadow-sm transition"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main 2-Column POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Fragrance Catalog (8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4">
          
          {/* Categories & Search filter */}
          <div className="bg-white/95 border border-slate-200/90 p-3 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm backdrop-blur-md">
            {/* Category Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-amber-500 text-slate-950 border border-amber-500 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                All Fragrances
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-slate-950 border border-amber-500 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Keyword Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes, name..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[720px] overflow-y-auto pr-1">
            {loading ? (
              <div className="col-span-full py-16 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading Fragrance Catalog for {selectedStore?.city?.name}...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 bg-white/80 border border-slate-200 rounded-2xl shadow-sm">
                <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No fragrances match your filter.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Try searching a different SKU or Category.</p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const inCartItem = cart.find((i) => i.product.id === prod.id);
                const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
                const isOutOfStock = storeStock <= 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => !isOutOfStock && addToCart(prod)}
                    className={`group bg-white hover:bg-amber-50/25 border rounded-2xl p-4 transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 ${
                      isOutOfStock
                        ? 'opacity-50 border-slate-200 cursor-not-allowed'
                        : inCartItem
                        ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/50'
                        : 'border-slate-200/90 hover:border-amber-400/70'
                    }`}
                  >
                    {/* Top Badges */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] uppercase tracking-[0.18em] font-semibold text-amber-800 bg-amber-100/70 border border-amber-300/70 px-2 py-0.5 rounded-full">
                        {prod.concentration.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                        {prod.volumeMl}ml
                      </span>
                    </div>

                    {/* Perfume Info */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 font-serif tracking-tight transition-colors">
                        {prod.name}
                      </h4>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center space-x-2">
                        <span>SKU: {prod.sku}</span>
                        {prod.barcode && <span>• {prod.barcode}</span>}
                      </div>

                      {/* Olfactory / Notes preview */}
                      {prod.fragranceNotes && (
                        <p className="text-[11px] text-slate-600 italic font-sans mt-2.5 line-clamp-2 leading-relaxed bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                          {prod.fragranceNotes}
                        </p>
                      )}
                    </div>

                    {/* Bottom Pricing & City Stock */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-base font-bold text-slate-950 font-mono tracking-tight">
                          ₹{Number(prod.sellingPrice).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          +18% GST incl.
                        </div>
                      </div>

                      <div className="text-right">
                        {isOutOfStock ? (
                          <div>
                            <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 block">
                              Out of Stock
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 block">
                              ({prod.stockQuantity} in network)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center space-x-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span className="text-[11px] font-medium text-slate-700">
                                {storeStock} in {selectedStore?.city?.name || 'City'}
                              </span>
                              {inCartItem && (
                                <span className="bg-amber-500 text-slate-950 font-bold text-xs px-1.5 py-0.2 rounded-full shadow-sm ml-1">
                                  {inCartItem.quantity}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-0.5">
                              Total Network: {prod.stockQuantity}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Billing Counter & Cart (4-5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4">
          
          <div className="bg-white backdrop-blur-2xl border border-slate-200/90 rounded-3xl p-5 shadow-xl flex flex-col h-full justify-between transition-colors">
            
            {/* Header: Counter Title & Active City */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 tracking-wide font-serif">
                      Boutique Register Cart
                    </h3>
                    <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                      <span>{selectedStore?.name}</span>
                      <span>•</span>
                      <span>{selectedStore?.city?.name}</span>
                    </span>
                  </div>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-slate-500 hover:text-rose-600 flex items-center space-x-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Quick Customer Info */}
              <div className="mt-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
                <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold mb-2 flex items-center space-x-1.5">
                  <User className="w-3 h-3 text-amber-600" />
                  <span>Customer Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="Guest / Client Name"
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition shadow-sm"
                  />
                  <div className="relative">
                    <Phone className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="Phone Number"
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition font-mono shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="mt-3 max-h-[250px] overflow-y-auto pr-1 space-y-2">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-medium">Cart is currently empty.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Select a fragrance from the catalog or scan a barcode.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50/90 hover:bg-slate-100/90 rounded-xl border border-slate-200/80 text-xs transition"
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-slate-900 truncate font-serif">{item.product.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ₹{Number(item.product.sellingPrice).toLocaleString('en-IN')} × {item.quantity} = 
                          <span className="font-semibold text-amber-700 ml-1">
                            ₹{(Number(item.product.sellingPrice) * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-5 h-5 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-mono font-bold text-slate-900 w-5 text-center text-xs">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-5 h-5 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Calculations & Payment Submission */}
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
              
              {/* Discount Section */}
              <div className="bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 flex items-center space-x-1">
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span>Apply Discount</span>
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setDiscountType('NONE')}
                      className={`text-[10px] px-2 py-0.5 rounded-lg transition ${
                        discountType === 'NONE' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => setDiscountType('FIXED')}
                      className={`text-[10px] px-2 py-0.5 rounded-lg transition ${
                        discountType === 'FIXED' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      ₹ Flat
                    </button>
                    <button
                      onClick={() => setDiscountType('PERCENTAGE')}
                      className={`text-[10px] px-2 py-0.5 rounded-lg transition ${
                        discountType === 'PERCENTAGE' ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      % Off
                    </button>
                  </div>
                </div>

                {discountType !== 'NONE' && (
                  <div className="relative mt-1">
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'FIXED' ? 'Enter ₹ Amount' : 'Enter % percentage'}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-mono shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Tax & Totals Breakdown */}
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-900 font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span className="font-mono font-medium">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxable Amount</span>
                  <span className="font-mono text-slate-900 font-medium">₹{taxableAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>CGST (9%) + SGST (9%)</span>
                  <span className="font-mono text-slate-600">₹{taxAmount.toFixed(2)}</span>
                </div>
                
                {/* Grand Total */}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                  <span className="text-sm font-bold text-slate-900 font-serif">Net Total</span>
                  <span className="text-2xl font-bold font-mono tracking-tight text-slate-950">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-semibold block">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setPaymentMethod('UPI_QR')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition ${
                      paymentMethod === 'UPI_QR'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-400/40 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-1 text-sky-500" />
                    <span>Dynamic QR</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition ${
                      paymentMethod === 'CASH'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-400/40 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-1 text-emerald-500" />
                    <span>Cash</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('CARD')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition ${
                      paymentMethod === 'CARD'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-400/40 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1 text-purple-500" />
                    <span>Card / POS</span>
                  </button>

                  <button
                    onClick={() => {
                      setPaymentMethod('SPLIT');
                      if (!splitCash && !splitCredit && !splitUpi && !splitCard) {
                        handlePresetSplit('CASH_CREDIT');
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition ${
                      paymentMethod === 'SPLIT'
                        ? 'bg-amber-100/70 border-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-400/40 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1 text-amber-600" />
                    <span>Split / Partial</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('CREDIT')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition col-span-2 sm:col-span-1 ${
                      paymentMethod === 'CREDIT'
                        ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-sm ring-1 ring-rose-400/40 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 mb-1 text-rose-500" />
                    <span>100% Credit</span>
                  </button>
                </div>
              </div>

              {/* Multi-Tender Split Breakdown Panel (Cash, UPI, Card, and Credit / Due) */}
              {paymentMethod === 'SPLIT' && (
                <div className="bg-amber-50/40 border border-amber-300/80 rounded-2xl p-3 space-y-2.5 animate-fade-in shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 font-semibold text-amber-900">
                      <Layers className="w-3.5 h-3.5 text-amber-600" />
                      <span>Split Allocation</span>
                    </div>

                    {Math.abs(splitRemaining) <= 0.01 && splitTotalAllocated > 0 ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-300/80 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Balanced ✓</span>
                      </span>
                    ) : splitRemaining > 0 ? (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                        Remaining: ₹{splitRemaining.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full">
                        Excess: ₹{Math.abs(splitRemaining).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Preset Shortcuts */}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handlePresetSplit('CASH_CREDIT')}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition font-medium"
                    >
                      Cash + Credit (Partial)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSplit('CASH_UPI')}
                      className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition font-medium shadow-sm"
                    >
                      50% Cash + 50% UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSplit('CASH_CARD')}
                      className="px-2 py-0.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-200 transition font-medium shadow-sm"
                    >
                      50% Cash + 50% Card
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetSplit('CLEAR')}
                      className="px-2 py-0.5 text-slate-400 hover:text-slate-600 ml-auto transition"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Cash Tender Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <label className="text-slate-700 font-medium flex items-center space-x-1">
                        <Banknote className="w-3 h-3 text-emerald-600" />
                        <span>Cash Amount (Paid Now)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFillSplitRemaining('cash')}
                        className="text-[10px] text-amber-700 hover:underline flex items-center space-x-0.5 font-semibold"
                      >
                        <Zap className="w-2.5 h-2.5" />
                        <span>Fill Balance</span>
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Customer Credit / Due Tender Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <label className="text-rose-700 font-semibold flex items-center space-x-1">
                        <BookOpen className="w-3 h-3 text-rose-600" />
                        <span>Customer Credit / Due Balance</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFillSplitRemaining('credit')}
                        className="text-[10px] text-rose-700 hover:underline flex items-center space-x-0.5 font-bold"
                      >
                        <Zap className="w-2.5 h-2.5" />
                        <span>Fill Balance</span>
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-rose-500 font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={splitCredit}
                        onChange={(e) => setSplitCredit(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-1.5 bg-rose-50/50 border border-rose-300 focus:border-rose-500 rounded-xl text-xs font-mono text-rose-900 placeholder-slate-400 focus:outline-none font-bold"
                      />
                    </div>
                  </div>

                  {/* UPI QR Tender Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <label className="text-slate-700 font-medium flex items-center space-x-1">
                        <QrCode className="w-3 h-3 text-sky-600" />
                        <span>Dynamic UPI QR (Customer Scan)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFillSplitRemaining('upi')}
                        className="text-[10px] text-amber-700 hover:underline flex items-center space-x-0.5 font-semibold"
                      >
                        <Zap className="w-2.5 h-2.5" />
                        <span>Fill Balance</span>
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={splitUpi}
                        onChange={(e) => setSplitUpi(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-200 focus:border-sky-500 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Card Tender Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <label className="text-slate-700 font-medium flex items-center space-x-1">
                        <CreditCard className="w-3 h-3 text-purple-600" />
                        <span>Card / POS Swipe</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFillSplitRemaining('card')}
                        className="text-[10px] text-amber-700 hover:underline flex items-center space-x-0.5 font-semibold"
                      >
                        <Zap className="w-2.5 h-2.5" />
                        <span>Fill Balance</span>
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={splitCard}
                        onChange={(e) => setSplitCard(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-200 focus:border-purple-500 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Total Allocated & Partial Due Summary */}
                  <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Total Allocated:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        ₹{splitTotalAllocated.toFixed(2)} / ₹{grandTotal.toFixed(2)}
                      </span>
                    </div>
                    {numSplitCredit > 0 && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-[11px] text-rose-800">
                        <span className="flex items-center space-x-1">
                          <BookOpen className="w-3 h-3 text-rose-500" />
                          <span>Partial Credit Due:</span>
                        </span>
                        <span className="font-mono font-bold">₹{numSplitCredit.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 100% Credit Notice */}
              {paymentMethod === 'CREDIT' && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800 space-y-1 animate-fade-in">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <BookOpen className="w-4 h-4 text-rose-500" />
                    <span>100% Customer Credit (Udhar / Khata)</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Bill will be recorded with ₹0 received now. Full <strong className="text-slate-900 font-mono">₹{grandTotal.toFixed(2)}</strong> balance will be tracked on customer's account.
                  </p>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                onClick={handleCheckout}
                disabled={
                  isSubmitting || 
                  cart.length === 0 || 
                  (paymentMethod === 'SPLIT' && (Math.abs(splitRemaining) > 0.05 || splitTotalAllocated <= 0))
                }
                className={`w-full py-3.5 px-4 rounded-2xl font-semibold text-sm tracking-wide transition-all shadow-xl flex items-center justify-center space-x-2 ${
                  cart.length === 0 || 
                  isSubmitting || 
                  (paymentMethod === 'SPLIT' && (Math.abs(splitRemaining) > 0.05 || splitTotalAllocated <= 0))
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold shadow-lg shadow-amber-500/25 active:scale-[0.99]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Processing Sale in {selectedStore?.city?.name}...</span>
                  </>
                ) : (
                  <>
                    {paymentMethod === 'SPLIT' ? <Layers className="w-4 h-4" /> : paymentMethod === 'CREDIT' ? <BookOpen className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                    <span>
                      {paymentMethod === 'UPI_QR'
                        ? `Generate Bill & Scan QR (₹${grandTotal.toFixed(2)})`
                        : paymentMethod === 'SPLIT'
                        ? Math.abs(splitRemaining) <= 0.05 && splitTotalAllocated > 0
                          ? numSplitCredit > 0
                            ? `Complete Partial Bill (Paid ₹${splitPaidNow.toFixed(2)} | Due ₹${numSplitCredit.toFixed(2)})`
                            : `Complete Split Bill (₹${grandTotal.toFixed(2)})`
                          : `Allocate Remaining ₹${splitRemaining.toFixed(2)} to Proceed`
                        : paymentMethod === 'CREDIT'
                        ? `Generate Credit Bill (Due ₹${grandTotal.toFixed(2)})`
                        : `Complete Bill • ₹${grandTotal.toFixed(2)}`}
                    </span>
                  </>
                )}
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
