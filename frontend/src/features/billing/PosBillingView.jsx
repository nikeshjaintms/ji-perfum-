import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import DataTable from '../../components/DataTable';
import { 
  LayoutGrid, 
  List, 
  Package, 
  Search, 
  X, 
  RefreshCw, 
  ShoppingCart, 
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { productService } from '../../services/api';
import { useCart } from '../../context/CartContext';

export default function PosBillingView({ selectedStore, onInvoiceCreated }) {
  // Catalog & Server-Side Pagination State
  const [products, setProducts] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cart Context (Global state shared across all screens)
  const {
    cart,
    cartCount,
    openCart,
    isCartOpen,
    addToCart,
    updateQuantity,
    removeFromCart,
    grandTotal,
  } = useCart();

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('jj_pos_view_mode') || 'grid';
  });

  const handleToggleView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('jj_pos_view_mode', mode);
  };

  // In-stock only filter state: default true for clean, fast checkout
  const [inStockOnly, setInStockOnly] = useState(() => {
    const saved = localStorage.getItem('jj_pos_in_stock_only');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleInStockOnly = (val) => {
    setInStockOnly(val);
    localStorage.setItem('jj_pos_in_stock_only', val ? 'true' : 'false');
    setPage(1);
  };

  const barcodeInputRef = useRef(null);

  // Debounce search typing for server queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load categories independently once
  const fetchCategories = useCallback(async () => {
    try {
      const catRes = await productService.getCategories();
      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Server-side Catalog Fetcher with Pagination & Filtering
  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {
        isActive: 'true',
        page,
        limit: pageSize,
      };
      if (selectedStore?.id) {
        params.storeId = selectedStore.id;
      }
      if (inStockOnly) {
        params.inStockOnly = 'true';
      }
      if (selectedCategory && selectedCategory !== 'ALL') {
        params.categoryId = selectedCategory;
      }
      if (debouncedSearch && debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (sortConfig && sortConfig.key) {
        params.sortBy = sortConfig.key;
        params.sortOrder = sortConfig.direction || 'asc';
      }

      const prodRes = await productService.getProducts(params);
      setProducts(prodRes.data || []);
      if (prodRes.pagination) {
        setTotalProducts(prodRes.pagination.total);
      } else {
        setTotalProducts((prodRes.data || []).length);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
      if (err.response?.status === 401) {
        setErrorMsg('Your sign-in expired. Sign out and sign in again.');
      } else {
        setErrorMsg('Can’t reach the server. Check the connection and press Refresh.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStore?.id, inStockOnly, selectedCategory, debouncedSearch, page, pageSize, sortConfig]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Listen to global catalog refresh broadcasts (e.g. after invoice creation)
  useEffect(() => {
    const handleCatalogRefresh = () => {
      fetchCatalog();
    };
    window.addEventListener('catalog:refresh', handleCatalogRefresh);
    return () => window.removeEventListener('catalog:refresh', handleCatalogRefresh);
  }, [fetchCatalog]);

  const loadCatalog = () => {
    fetchCatalog();
    fetchCategories();
  };

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    setPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSortChange = (newSort) => {
    setSortConfig(newSort);
    setPage(1);
  };

  const handleAddToCart = (product) => {
    const storeStock = product.currentStoreStock !== undefined ? product.currentStoreStock : product.stockQuantity;
    if (storeStock <= 0) {
      setErrorMsg(`Cannot add to bill: "${product.name}" is out of stock at ${cityName}.`);
      setTimeout(() => setErrorMsg(''), 4500);
      return;
    }
    const res = addToCart(product, storeStock);
    if (!res.success && res.message) {
      setErrorMsg(res.message);
      setTimeout(() => setErrorMsg(''), 4500);
    }
  };

  // Barcode / SKU Scan Handler
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    // Check if product is already in currently loaded products list
    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase() === code.toLowerCase())
    );

    if (found) {
      const storeStock = found.currentStoreStock !== undefined ? found.currentStoreStock : found.stockQuantity;
      if (storeStock <= 0) {
        setErrorMsg(`Cannot add to bill: "${found.name}" is out of stock at ${cityName} (0 counter stock).`);
        setTimeout(() => setErrorMsg(''), 5000);
        setBarcodeInput('');
        return;
      }
      handleAddToCart(found);
      setBarcodeInput('');
      return;
    }

    try {
      // Lookup product by barcode/SKU with storeId so counter stock is accurate
      const res = await productService.getProducts({
        search: code,
        storeId: selectedStore?.id,
        limit: 1,
      });
      if (res.data && res.data.length > 0) {
        const prod = res.data[0];
        const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
        if (storeStock <= 0) {
          setErrorMsg(`Cannot add to bill: "${prod.name}" is out of stock at ${cityName} (0 counter stock).`);
          setTimeout(() => setErrorMsg(''), 5000);
        } else {
          handleAddToCart(prod);
        }
        setBarcodeInput('');
      } else {
        setErrorMsg(`No fragrance found with barcode or SKU "${code}".`);
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(`Lookup failed for barcode or SKU "${code}".`);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const cityName = selectedStore?.city?.name || 'this counter';
  const fieldClass =
    'w-full px-2.5 py-1.5 bg-white border border-slate-300 focus:border-amber-500 rounded-md text-sm text-slate-900 placeholder-slate-400 focus:outline-none';

  const posColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Fragrance',
      sortAccessor: (prod) => prod.name,
      sortable: true,
      className: 'min-w-[210px]',
      render: (_, prod) => (
        <div className="flex items-center gap-3 min-w-0">
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
      className: 'tabular-nums font-mono whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, prod) => (
        <div className="whitespace-nowrap">
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
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, prod) => (
        <span className="inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700 text-[11px] font-medium whitespace-nowrap">
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
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, prod) => {
        const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
        const isOutOfStock = storeStock <= 0;
        return (
          <div className="text-xs whitespace-nowrap">
            {isOutOfStock ? (
              <>
                <span className="text-rose-700 font-semibold whitespace-nowrap">Out of stock</span>
                <span className="block text-[11px] text-slate-400 whitespace-nowrap">{prod.stockQuantity} across chain</span>
              </>
            ) : (
              <>
                <span className={`font-semibold whitespace-nowrap ${storeStock <= 5 ? 'text-amber-700' : 'text-slate-800'}`}>
                  {storeStock} in {cityName}
                </span>
                <span className="block text-[11px] text-slate-400 whitespace-nowrap">{prod.stockQuantity} total in chain</span>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'sellingPrice',
      header: 'Price',
      sortAccessor: (prod) => Number(prod.sellingPrice) || 0,
      sortable: true,
      align: 'right',
      className: 'tabular-nums whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, prod) => (
        <div className="text-right whitespace-nowrap">
          <span className="font-semibold text-slate-900 whitespace-nowrap">₹{Number(prod.sellingPrice).toLocaleString('en-IN')}</span>
          <span className="block text-[10px] text-slate-400 font-light whitespace-nowrap">+ 18% GST</span>
        </div>
      ),
    },
    {
      key: 'inBill',
      header: 'In Bill',
      sortable: false,
      align: 'center',
      className: 'tabular-nums whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, prod) => {
        const inCartItem = cart.find((i) => i.product.id === prod.id);
        if (!inCartItem) return <span className="text-slate-300 font-light">—</span>;
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
            × {inCartItem.quantity}
          </span>
        );
      },
    },
    {
      key: 'action',
      header: '',
      sortable: false,
      align: 'right',
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, prod) => {
        const inCartItem = cart.find((i) => i.product.id === prod.id);
        const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
        const isOutOfStock = storeStock <= 0;

        if (inCartItem) {
          return (
            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center border border-slate-300 rounded-lg bg-white shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(prod.id, -1);
                  }}
                  title={`Decrease quantity of ${prod.name}`}
                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold text-sm transition cursor-pointer"
                >
                  −
                </button>
                <span className="w-7 text-center text-xs font-bold text-slate-900 tabular-nums">
                  {inCartItem.quantity}
                </span>
                <button
                  type="button"
                  disabled={isOutOfStock || inCartItem.quantity >= storeStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(prod);
                  }}
                  title={`Increase quantity of ${prod.name}`}
                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold text-sm transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromCart(prod.id);
                }}
                title={`Remove ${prod.name} from bill`}
                className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 text-xs font-medium shadow-2xs whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        return (
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart(prod);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap inline-flex items-center justify-center shrink-0 ${
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
  ], [cart, cityName, handleAddToCart, updateQuantity, removeFromCart]);

  return (
    <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="w-full">
        {/* Fragrance Catalog */}
        <section className="w-full min-w-0">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2 max-w-xl w-full">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              aria-label="Scan a barcode or type a SKU"
              placeholder="Scan a barcode or type a SKU"
              className={`${fieldClass} py-2 flex-1 min-w-0`}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-slate-800 shrink-0 cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Add</span>
            </button>
          </form>

          {errorMsg && (
            <p role="alert" className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 max-w-xl">
              {errorMsg}
            </p>
          )}

          {/* Categories Filter Pills (Clean Wrap, Zero Horizontal Scroll) */}
          <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
              Category:
            </span>
            {[{ id: 'ALL', name: 'All' }, ...categories].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-white font-semibold shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <span className="whitespace-nowrap">{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Catalog Toolbar: View Toggle & Search */}
          <div className="my-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3">
            {/* View Mode Switcher & In-Stock Filter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleView('grid')}
                  title="Grid View"
                  className={`p-1.5 rounded-md text-xs transition cursor-pointer flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs font-medium' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline text-[11px] whitespace-nowrap">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleView('list')}
                  title="List View"
                  className={`p-1.5 rounded-md text-xs transition cursor-pointer flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                    viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs font-medium' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline text-[11px] whitespace-nowrap">List</span>
                </button>
              </div>

              {/* In-Stock Filter: Segmented Control matching Grid/List */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleInStockOnly(true)}
                  title="Show in-stock fragrances only"
                  className={`px-2.5 py-1.5 rounded-md text-xs transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                    inStockOnly
                      ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${inStockOnly ? 'text-white' : 'text-emerald-600'}`} />
                  <span className="text-[11px] whitespace-nowrap">In stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleInStockOnly(false)}
                  title="Show all fragrances including out-of-stock"
                  className={`px-2.5 py-1.5 rounded-md text-xs transition cursor-pointer flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                    !inStockOnly
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Package className={`w-3.5 h-3.5 shrink-0 ${!inStockOnly ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className="text-[11px] whitespace-nowrap">All items</span>
                </button>
              </div>
            </div>

            {/* Search Input, Refresh Icon & Cart Button */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial sm:w-80 max-w-full justify-end">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search fragrances"
                  placeholder="Search name, SKU or notes..."
                  className={`${fieldClass} pl-8 pr-7 w-full py-1.5 text-xs`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setPage(1); }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Refresh Icon Button */}
              <button
                type="button"
                onClick={loadCatalog}
                title="Refresh fragrances"
                className="p-1.5 sm:p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 shadow-2xs transition cursor-pointer flex items-center justify-center shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
              </button>

              {/* Cart / Bill Button */}
              <button
                type="button"
                id="pos-cart-btn"
                onClick={openCart}
                className={`relative flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 whitespace-nowrap ${
                    isCartOpen
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                title="View Current Bill / Cart"
              >
                <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                <span className="inline whitespace-nowrap">Bill</span>
                {cartCount > 0 && (
                  <span className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums whitespace-nowrap">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            /* POS GRID VIEW */
            <>
              {products.length === 0 && !loading ? (
                <div className="py-12 text-center bg-white border border-slate-200 rounded-xl my-2 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6 text-slate-400" />
                  </div>
                  <h3 className="font-serif text-base font-semibold text-slate-900">
                    {inStockOnly ? 'No in-stock fragrances found' : 'Nothing matches that search'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {inStockOnly
                      ? `All matching fragrances are currently out of stock at ${cityName}.`
                      : 'Try adjusting your search terms or clearing category filters.'}
                  </p>
                  {inStockOnly && (
                    <button
                      type="button"
                      onClick={() => handleToggleInStockOnly(false)}
                      className="mt-3 px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-medium transition cursor-pointer shadow-2xs"
                    >
                      Show out-of-stock items
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 py-1 no-scrollbar sm:overflow-y-auto">
              {products.map((prod) => {
                const inCartItem = cart.find((i) => i.product.id === prod.id);
                const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
                const isOutOfStock = storeStock <= 0;

                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(prod)}
                    className={`text-left p-3 rounded-xl border transition flex flex-col justify-between relative group ${
                      isOutOfStock
                        ? 'bg-slate-50/50 border-slate-200/60 opacity-60 cursor-not-allowed'
                        : inCartItem
                        ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-400/30 hover:border-amber-400 cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer'
                    }`}
                  >
                    <div>
                      {/* Thumbnail Container */}
                      <div className="w-full aspect-square rounded-lg bg-slate-100 border border-slate-200/80 mb-2 overflow-hidden flex items-center justify-center relative">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.pos-grid-fallback');
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <Package className={`pos-grid-fallback w-8 h-8 text-slate-300 ${prod.imageUrl ? 'hidden' : ''}`} />

                        {inCartItem && (
                          <div
                            className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-amber-300 rounded-full p-0.5 shadow-sm whitespace-nowrap z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(prod.id, -1);
                              }}
                              title="Decrease"
                              className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-rose-600 hover:bg-rose-50 rounded-full text-xs font-bold transition cursor-pointer"
                            >
                              −
                            </button>
                            <span className="bg-amber-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full tabular-nums whitespace-nowrap">
                              {inCartItem.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={isOutOfStock || inCartItem.quantity >= storeStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(prod);
                              }}
                              title="Increase"
                              className="w-5 h-5 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(prod.id);
                              }}
                              title="Remove from bill"
                              className="w-5 h-5 flex items-center justify-center text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full text-xs transition cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {prod.sku}
                      </div>
                      <div className="font-serif text-sm font-semibold text-slate-900 line-clamp-1 mt-0.5">
                        {prod.name}
                      </div>
                      <div className="text-[11px] text-slate-500 whitespace-nowrap truncate">
                        {prod.concentration ? prod.concentration.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'Perfume'} · {prod.volumeMl} ml
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between gap-1">
                      <div className="whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          ₹{Number(prod.sellingPrice).toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[9px] text-slate-400 whitespace-nowrap">+ 18% GST</span>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="text-[10px] font-semibold text-rose-600 uppercase whitespace-nowrap">
                            Out
                          </span>
                        ) : (
                          <span className={`text-[10px] font-medium whitespace-nowrap ${storeStock <= 5 ? 'text-amber-700' : 'text-slate-500'}`}>
                            {storeStock} in counter
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            )}

            {/* Pagination controls for grid view */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
              <div>
                Showing <span className="font-medium text-slate-900">{totalProducts === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium text-slate-900">{Math.min(page * pageSize, totalProducts)}</span> of <span className="font-medium text-slate-900">{totalProducts}</span> fragrances
              </div>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="px-2 font-medium">Page {page} of {Math.max(1, Math.ceil(totalProducts / pageSize))}</span>
                <button
                  type="button"
                  disabled={page >= Math.ceil(totalProducts / pageSize)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
          ) : (
            /* POS LIST VIEW WITH DATATABLE */
            <DataTable
              columns={posColumns}
              data={products}
              totalCount={totalProducts}
              totalRecords={totalProducts}
              serverSide={true}
              currentPage={page}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              sortConfig={sortConfig}
              onSortChange={handleSortChange}
              loading={loading}
              searchable={false}
              pagination={true}
              defaultPageSize={10}
              pageSizeOptions={[10, 25, 50]}
              emptyIcon={Package}
              emptyMessage={inStockOnly ? "No in-stock fragrances found" : "Nothing matches that search"}
              emptySubtext={inStockOnly ? `All matching fragrances are out of stock at ${cityName}. Switch to 'All items' above to check inventory.` : "Try part of the name, or clear the filter above."}
              initialSort={{ key: 'name', direction: 'asc' }}
              onRowClick={(prod) => {
                const storeStock = prod.currentStoreStock !== undefined ? prod.currentStoreStock : prod.stockQuantity;
                if (storeStock > 0) {
                  handleAddToCart(prod);
                } else {
                  setErrorMsg(`Cannot add to bill: "${prod.name}" is out of stock at ${cityName}.`);
                  setTimeout(() => setErrorMsg(''), 4500);
                }
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
      </div>

      {/* Floating Bottom Cart Bar for Tablet & Mobile (< lg) */}
      {!isCartOpen && cartCount > 0 && (
        <aside
          id="pos-floating-cart-bar"
          className="lg:hidden fixed bottom-4 left-3 right-3 sm:left-6 sm:right-6 z-40 flex items-center justify-between p-3 sm:p-3.5 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80"
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="relative p-2.5 bg-amber-500 text-white rounded-xl shadow-xs border border-amber-400/30 shrink-0">
              <ShoppingCart className="w-5 h-5 text-white" />
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-xs border-2 border-slate-900">
                {cartCount}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-300 font-normal leading-none truncate">
                {cartCount} {cartCount === 1 ? 'item' : 'items'} in bill
              </div>
              <div className="text-base font-semibold text-white tabular-nums mt-0.5 font-serif">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <button
            type="button"
            id="pos-floating-view-bill-btn"
            onClick={openCart}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5 shrink-0 active:scale-95"
          >
            <span>View Bill</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
          </button>
        </aside>
      )}
    </div>
  );
}
