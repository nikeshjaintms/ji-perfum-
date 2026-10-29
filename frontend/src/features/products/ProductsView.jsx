import React, { useState, useEffect, useMemo } from 'react';
import DataTable from '../../components/DataTable';
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Barcode, 
  Tag, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  X,
  MapPin,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Upload,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { productService, storeService } from '../../services/api';

export default function ProductsView({ stores: propStores = [] }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState(propStores);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // View Mode: 'grid' | 'list'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('jj_products_view_mode') || 'grid';
  });

  const handleToggleView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('jj_products_view_mode', mode);
  };

  // Form State
  const initialForm = {
    name: '',
    sku: '',
    barcode: '',
    imageUrl: '',
    categoryId: '',
    brand: 'J I PERFUME',
    description: '',
    fragranceNotes: '',
    concentration: 'EAU_DE_PARFUM',
    volumeMl: 100,
    purchaseCost: '',
    sellingPrice: '',
    taxRate: 18,
    reorderLevel: 5,
    storeStocks: {},
  };
  const [formData, setFormData] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Stock In State
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [stockInProduct, setStockInProduct] = useState(null);
  const [stockInStoreId, setStockInStoreId] = useState('');
  const [stockInQty, setStockInQty] = useState(25);
  const [stockInNotes, setStockInNotes] = useState('Stock receipt from distillery / warehouse');
  const [stockInSubmitting, setStockInSubmitting] = useState(false);
  const [stockInSuccess, setStockInSuccess] = useState('');
  const [stockInError, setStockInError] = useState('');
  const [stockInFieldErrors, setStockInFieldErrors] = useState({});

  const handleOpenQuickStockIn = (product = null) => {
    const prod = product || products[0];
    setStockInProduct(prod);
    setStockInStoreId(stores[0]?.id || '');
    setStockInQty(25);
    setStockInNotes('Stock receipt from distillery / warehouse');
    setStockInSuccess('');
    setStockInError('');
    setStockInFieldErrors({});
    setIsStockInModalOpen(true);
  };

  const validateProductForm = () => {
    const errors = {};
    const nameTrim = (formData.name || '').trim();
    if (!nameTrim) {
      errors.name = 'Fragrance name is required';
    } else if (nameTrim.length < 2) {
      errors.name = 'Fragrance name must be at least 2 characters';
    }

    const skuTrim = (formData.sku || '').trim();
    if (!skuTrim) {
      errors.sku = 'SKU code is required';
    } else if (skuTrim.length < 2) {
      errors.sku = 'SKU code must be at least 2 characters';
    }

    if (!formData.categoryId) {
      errors.categoryId = 'Please select a fragrance category';
    }

    const costStr = String(formData.purchaseCost ?? '').trim();
    const costNum = Number(costStr);
    if (costStr === '' || isNaN(costNum)) {
      errors.purchaseCost = 'Purchase cost is required';
    } else if (costNum < 0) {
      errors.purchaseCost = 'Purchase cost cannot be negative';
    }

    const priceStr = String(formData.sellingPrice ?? '').trim();
    const priceNum = Number(priceStr);
    if (priceStr === '' || isNaN(priceNum)) {
      errors.sellingPrice = 'Selling price is required';
    } else if (priceNum <= 0) {
      errors.sellingPrice = 'Selling price must be greater than ₹0';
    }

    if (formData.volumeMl !== '' && formData.volumeMl !== null && formData.volumeMl !== undefined) {
      const volNum = Number(formData.volumeMl);
      if (isNaN(volNum) || volNum <= 0) {
        errors.volumeMl = 'Volume must be greater than 0 ml';
      }
    }

    if (formData.imageUrl && formData.imageUrl.trim()) {
      const url = formData.imageUrl.trim();
      if (!url.startsWith('data:') && !/^https?:\/\//i.test(url)) {
        errors.imageUrl = 'Please enter a valid image URL starting with http:// or https://';
      }
    }

    return errors;
  };

  const validateStockInForm = () => {
    const errors = {};
    if (!stockInProduct || !stockInProduct.id) {
      errors.product = 'Please select a fragrance product';
    }
    if (!stockInStoreId) {
      errors.store = 'Please select a destination boutique outlet';
    }
    const qty = Number(stockInQty);
    if (stockInQty === '' || stockInQty === null || isNaN(qty) || qty < 1) {
      errors.qty = 'Quantity must be at least 1 unit';
    } else if (!Number.isInteger(qty)) {
      errors.qty = 'Quantity must be a whole number';
    }
    return errors;
  };

  const handleStockInSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateStockInForm();
    if (Object.keys(validationErrors).length > 0) {
      setStockInFieldErrors(validationErrors);
      return;
    }
    setStockInFieldErrors({});

    try {
      setStockInSubmitting(true);
      setStockInError('');
      setStockInSuccess('');

      const res = await productService.adjustStock(stockInProduct.id, {
        storeId: stockInStoreId,
        quantityChange: Number(stockInQty),
        notes: stockInNotes.trim(),
      });

      if (res.success) {
        setStockInSuccess(`Successfully added +${stockInQty} units!`);
        await loadProducts();
        setTimeout(() => {
          setIsStockInModalOpen(false);
          setStockInSuccess('');
        }, 1200);
      }
    } catch (err) {
      setStockInError(err.response?.data?.message || 'Failed to update inventory stock.');
    } finally {
      setStockInSubmitting(false);
    }
  };

  // Always ensure stores are loaded
  useEffect(() => {
    if (!stores.length) {
      storeService.getStores()
        .then((res) => {
          if (res.data?.length) setStores(res.data);
        })
        .catch(console.error);
    }
  }, [stores.length]);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {};
      if (selectedCategory !== 'ALL') {
        params.categoryId = selectedCategory;
      }
      if (search) {
        params.search = search;
      }
      const [prodRes, catRes] = await Promise.all([
        productService.getProducts(params),
        productService.getCategories(),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      if (!formData.categoryId && catRes.data?.length > 0) {
        setFormData((prev) => ({ ...prev, categoryId: catRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      setErrorMsg('Failed to load products from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    const defaultStoreStocks = {};
    stores.forEach((st) => {
      defaultStoreStocks[st.id] = 20;
    });
    setFormData({
      ...initialForm,
      categoryId: categories[0]?.id || '',
      storeStocks: defaultStoreStocks,
      imageUrl: '',
    });
    setFormErrors({});
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    const existingStoreStocks = {};
    stores.forEach((st) => {
      const bal = product.stockBalances?.find((b) => b.storeId === st.id);
      existingStoreStocks[st.id] = bal ? bal.quantity : 0;
    });

    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      imageUrl: product.imageUrl || '',
      categoryId: product.categoryId,
      brand: product.brand || 'J I PERFUME',
      description: product.description || '',
      fragranceNotes: product.fragranceNotes || '',
      concentration: product.concentration || 'EAU_DE_PARFUM',
      volumeMl: product.volumeMl || 100,
      purchaseCost: product.purchaseCost,
      sellingPrice: product.sellingPrice,
      taxRate: product.taxRate || 18,
      reorderLevel: product.reorderLevel,
      storeStocks: existingStoreStocks,
    });
    setFormErrors({});
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((prev) => ({
        ...prev,
        imageUrl: ev.target?.result || '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateProductForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFormErrors({});

    try {
      setFormSubmitting(true);
      setErrorMsg('');

      const payload = {
        ...formData,
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        barcode: formData.barcode ? formData.barcode.trim() : '',
        purchaseCost: Number(formData.purchaseCost),
        sellingPrice: Number(formData.sellingPrice),
        volumeMl: Number(formData.volumeMl) || 100,
      };

      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, payload);
      } else {
        await productService.createProduct(payload);
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const productColumns = useMemo(() => [
    {
      key: 'name',
      header: 'Fragrance',
      sortAccessor: (prod) => prod.name,
      sortable: true,
      render: (_, prod) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {prod.imageUrl ? (
              <img
                src={prod.imageUrl}
                alt={prod.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.tbl-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }}
              />
            ) : null}
            <Package className={`tbl-fallback w-5 h-5 text-slate-300 ${prod.imageUrl ? 'hidden' : ''}`} />
          </div>

          <div className="min-w-0">
            <div className="font-serif font-medium text-slate-900 text-sm truncate">{prod.name}</div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">
              {prod.concentration?.replace(/_/g, ' ')} • {prod.volumeMl}ml
            </div>
            {prod.fragranceNotes && (
              <div className="text-[11px] text-slate-500 font-light italic mt-0.5 truncate max-w-xs">
                {prod.fragranceNotes}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU & Barcode',
      sortAccessor: (prod) => prod.sku,
      sortable: true,
      className: 'tabular-nums',
      render: (_, prod) => (
        <div>
          <div className="text-slate-900 font-medium flex items-center space-x-1.5 font-mono">
            <Tag className="w-3 h-3 text-amber-600" />
            <span>{prod.sku}</span>
          </div>
          {prod.barcode && (
            <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5 font-light font-mono">
              <Barcode className="w-3 h-3 text-slate-400" />
              <span>{prod.barcode}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortAccessor: (prod) => prod.category?.name || '',
      sortable: true,
      render: (_, prod) => (
        <span className="inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700 text-[11px] font-medium">
          {prod.category?.name || 'Fragrance'}
        </span>
      ),
    },
    {
      key: 'sellingPrice',
      header: 'Price',
      sortAccessor: (prod) => Number(prod.sellingPrice || 0),
      sortable: true,
      align: 'right',
      className: 'tabular-nums font-semibold text-slate-900 text-sm whitespace-nowrap',
      render: (val) => `₹${Number(val).toFixed(2)}`,
    },
    {
      key: 'stockBalances',
      header: 'Stock by Outlet',
      sortable: false,
      render: (_, prod) => (
        <div className="flex flex-wrap gap-1.5">
          {prod.stockBalances && prod.stockBalances.length > 0 ? (
            prod.stockBalances.map((bal) => {
              const q = bal.quantity;
              const cityName = bal.store?.city?.name || bal.store?.name?.split(' ')[0] || 'Store';
              return (
                <span
                  key={bal.id || bal.storeId}
                  className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] tabular-nums border ${
                    q <= 0
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : q <= 5
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-slate-400 font-light">{cityName}:</span>
                  <span className="font-semibold text-slate-900">{q}</span>
                </span>
              );
            })
          ) : (
            <span className="text-slate-400 text-[11px] font-light">No stock recorded</span>
          )}
        </div>
      ),
    },
    {
      key: 'stockQuantity',
      header: 'Total Stock',
      sortAccessor: (prod) => Number(prod.stockQuantity || 0),
      sortable: true,
      align: 'center',
      className: 'whitespace-nowrap',
      render: (val) => {
        const qty = Number(val || 0);
        const isOutOfStock = qty <= 0;
        const isLow = qty <= 10;
        return (
          <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs tabular-nums font-medium border ${
            isOutOfStock
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isLow
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            <span>{qty}</span>
            <span className="text-[11px] opacity-75 font-sans">units</span>
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'center',
      className: 'whitespace-nowrap',
      render: (_, prod) => (
        <div className="flex items-center justify-center space-x-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenQuickStockIn(prod); }}
            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition flex items-center space-x-1 cursor-pointer"
            title="Add / Receive Stock In"
          >
            <Plus className="w-3 h-3 text-emerald-700" />
            <span>Stock In</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handleOpenEditModal(prod); }}
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition cursor-pointer"
            title="Edit Fragrance & City Stock"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-slate-900">Products & Inventory</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Boutique inventory catalog, olfactory profiles, multi-city allocations and prices.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, barcode, notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition font-sans shadow-sm"
            />
          </form>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => handleToggleView('grid')}
              title="Grid View"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleView('list')}
              title="List View"
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Quick Stock In Button */}
          <button
            onClick={() => handleOpenQuickStockIn()}
            id="quick-stock-in-btn"
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold tracking-wide transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>Stock In</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add product</span>
          </button>
        </div>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex items-center gap-5 mb-5 overflow-x-auto border-b border-slate-200">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`pb-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'border-amber-500 text-slate-900 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          All ({products.length})
        </button>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`pb-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
                isActive
                  ? 'border-amber-500 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {cat.name} ({cat._count?.products || 0})
            </button>
          );
        })}
      </div>

      {/* Loading & Empty States */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl py-24 text-center text-slate-500 shadow-xs">
          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2.5 opacity-80" />
          <span className="text-sm text-slate-500 font-light">Loading boutique fragrance vault...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-24 text-center text-slate-500 shadow-xs">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <p className="font-serif text-base text-slate-700">No fragrances found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your category filter or search keywords.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((prod) => {
            const isOutOfStock = prod.stockQuantity <= 0;
            const isLowStock = !isOutOfStock && prod.stockQuantity <= (prod.reorderLevel || 10);

            return (
              <div
                key={prod.id}
                className="group bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Product Image Banner */}
                <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 overflow-hidden flex items-center justify-center">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.img-fallback');
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}

                  {/* Fallback Icon Container */}
                  <div className={`img-fallback flex flex-col items-center justify-center text-slate-400 ${prod.imageUrl ? 'hidden' : ''}`}>
                    <Package className="w-10 h-10 stroke-[1.25] text-slate-300 mb-1" />
                    <span className="text-[10px] tracking-wider uppercase font-mono text-slate-400">No image</span>
                  </div>

                  {/* Category Badge & Stock Status Badge */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
                    <span className="px-2 py-0.5 bg-white/95 backdrop-blur-sm rounded-md text-[10px] font-semibold text-slate-800 border border-slate-200 shadow-xs">
                      {prod.category?.name || 'Fragrance'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-sm border shadow-xs ${
                        isOutOfStock
                          ? 'bg-rose-50/95 text-rose-700 border-rose-200'
                          : isLowStock
                          ? 'bg-amber-50/95 text-amber-800 border-amber-200'
                          : 'bg-emerald-50/95 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isOutOfStock ? 'Out of stock' : isLowStock ? `${prod.stockQuantity} low stock` : `${prod.stockQuantity} in stock`}
                    </span>
                  </div>

                  {/* Concentration & Volume overlay at bottom */}
                  <div className="absolute bottom-2 left-2.5">
                    <span className="px-2 py-0.5 bg-slate-900/75 backdrop-blur-md text-amber-300 rounded text-[10px] font-medium tracking-wide">
                      {prod.concentration?.replace(/_/g, ' ')} · {prod.volumeMl}ml
                    </span>
                  </div>
                </div>

                {/* Card Info Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] tracking-widest uppercase font-semibold text-amber-700">
                        {prod.brand || 'J I PERFUME'}
                      </div>
                      <h3 className="font-serif font-medium text-slate-900 text-base leading-snug group-hover:text-amber-700 transition-colors truncate">
                        {prod.name}
                      </h3>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="font-semibold text-slate-900 text-sm tabular-nums">
                        ₹{Number(prod.sellingPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* SKU & Barcode */}
                  <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-700">
                      <Tag className="w-3 h-3 text-amber-600" />
                      <span>{prod.sku}</span>
                    </span>
                    {prod.barcode && <span className="text-slate-400">· {prod.barcode}</span>}
                  </div>

                  {/* Fragrance Notes */}
                  {prod.fragranceNotes && (
                    <p className="text-xs text-slate-500 italic font-serif line-clamp-2 mt-2 leading-relaxed">
                      {prod.fragranceNotes}
                    </p>
                  )}

                  {/* City Stock Breakdown */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      <span>Stock by Boutique</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {prod.stockBalances && prod.stockBalances.length > 0 ? (
                        prod.stockBalances.map((bal) => {
                          const q = bal.quantity;
                          const cityName = bal.store?.city?.name || bal.store?.name?.split(' ')[0] || 'Store';
                          return (
                            <span
                              key={bal.id || bal.storeId}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${
                                q <= 0
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : q <= 5
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              <span className="text-slate-400">{cityName}:</span>
                              <span className="font-semibold text-slate-800">{q}</span>
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No city stock recorded</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenQuickStockIn(prod)}
                      className="flex-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-700" />
                      <span>Stock In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(prod)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs transition cursor-pointer"
                      title="Edit Fragrance"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <DataTable
          columns={productColumns}
          data={products}
          loading={loading}
          searchPlaceholder="Instant search fragrance name, SKU, notes, barcode..."
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50, 100]}
          emptyIcon={Package}
          emptyMessage="No fragrances found"
          emptySubtext="Try adjusting your category filter or search keywords."
          initialSort={{ key: 'name', direction: 'asc' }}
        />
      )}

      {/* Add / Edit Product Modal with Image & Multi-City Stock Inputs */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto text-slate-900">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-700 font-semibold block">Catalog Record</span>
                  <h3 className="text-base font-serif text-slate-900 font-semibold">
                    {editingProduct ? 'Edit Fragrance SKU' : 'Add New Fragrance SKU'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
                {errorMsg}
              </div>
            )}

            <form noValidate onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              
              {/* Product Image Section */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <label className="text-xs font-semibold text-slate-800 block mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>Product Fragrance Image</span>
                </label>

                <div className="flex items-start gap-4">
                  {/* Image Preview Box */}
                  <div className="w-20 h-20 rounded-lg border border-slate-200 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-xs">
                    {formData.imageUrl ? (
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-1">
                        <ImageIcon className="w-6 h-6 stroke-[1.25] text-slate-300" />
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">Preview</span>
                      </div>
                    )}
                  </div>

                  {/* Upload and URL input */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium cursor-pointer transition flex items-center gap-1.5 shadow-xs">
                        <Upload className="w-3.5 h-3.5 text-amber-600" />
                        <span>Upload from device</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>

                      {formData.imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, imageUrl: '' });
                            if (formErrors.imageUrl) setFormErrors((prev) => ({ ...prev, imageUrl: '' }));
                          }}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, imageUrl: e.target.value });
                        if (formErrors.imageUrl) setFormErrors((prev) => ({ ...prev, imageUrl: '' }));
                      }}
                      placeholder="Or paste external image URL (https://...)"
                      className={`w-full px-2.5 py-1.5 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition shadow-xs border ${
                        formErrors.imageUrl
                          ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                          : 'border-slate-200 focus:border-amber-500 bg-white'
                      }`}
                    />
                    {formErrors.imageUrl && (
                      <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span>{formErrors.imageUrl}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Fragrance Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="e.g. JJ Royal Oud Extreme"
                    className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 focus:outline-none transition shadow-sm border ${
                      formErrors.name
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{formErrors.name}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    SKU Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => {
                      setFormData({ ...formData, sku: e.target.value.toUpperCase() });
                      if (formErrors.sku) setFormErrors((prev) => ({ ...prev, sku: '' }));
                    }}
                    placeholder="e.g. JJ-OUD-EXT"
                    className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 tabular-nums focus:outline-none transition shadow-sm border ${
                      formErrors.sku
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                    }`}
                  />
                  {formErrors.sku && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{formErrors.sku}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Barcode / EAN</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="e.g. 890123456008"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 tabular-nums focus:outline-none transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => {
                      setFormData({ ...formData, categoryId: e.target.value });
                      if (formErrors.categoryId) setFormErrors((prev) => ({ ...prev, categoryId: '' }));
                    }}
                    className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 focus:outline-none cursor-pointer shadow-sm border ${
                      formErrors.categoryId
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-amber-500 bg-white'
                    }`}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-white text-slate-900">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.categoryId && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{formErrors.categoryId}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Concentration</label>
                  <select
                    value={formData.concentration}
                    onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 focus:outline-none cursor-pointer shadow-sm"
                  >
                    <option value="EXTRAIT_DE_PARFUM" className="bg-white text-slate-900">Extrait De Parfum</option>
                    <option value="EAU_DE_PARFUM" className="bg-white text-slate-900">Eau De Parfum</option>
                    <option value="EAU_DE_TOILETTE" className="bg-white text-slate-900">Eau De Toilette</option>
                    <option value="EAU_DE_COLOGNE" className="bg-white text-slate-900">Eau De Cologne</option>
                    <option value="ATTAR_OIL" className="bg-white text-slate-900">Attar Oil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Volume (ml)</label>
                  <input
                    type="number"
                    value={formData.volumeMl}
                    onChange={(e) => {
                      setFormData({ ...formData, volumeMl: e.target.value });
                      if (formErrors.volumeMl) setFormErrors((prev) => ({ ...prev, volumeMl: '' }));
                    }}
                    placeholder="100"
                    className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 tabular-nums focus:outline-none transition shadow-sm border ${
                      formErrors.volumeMl
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                    }`}
                  />
                  {formErrors.volumeMl && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{formErrors.volumeMl}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Purchase Cost (₹) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchaseCost}
                    onChange={(e) => {
                      setFormData({ ...formData, purchaseCost: e.target.value });
                      if (formErrors.purchaseCost) setFormErrors((prev) => ({ ...prev, purchaseCost: '' }));
                    }}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 tabular-nums focus:outline-none transition shadow-sm border ${
                      formErrors.purchaseCost
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                    }`}
                  />
                  {formErrors.purchaseCost && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{formErrors.purchaseCost}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Selling Price (₹) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => {
                      setFormData({ ...formData, sellingPrice: e.target.value });
                      if (formErrors.sellingPrice) setFormErrors((prev) => ({ ...prev, sellingPrice: '' }));
                    }}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 rounded-md text-xs text-slate-900 tabular-nums focus:outline-none transition shadow-sm border ${
                      formErrors.sellingPrice
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                    }`}
                  />
                  {formErrors.sellingPrice && (
                    <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{formErrors.sellingPrice}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Fragrance Olfactory Notes */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Olfactory Profile & Notes</label>
                <input
                  type="text"
                  value={formData.fragranceNotes}
                  onChange={(e) => setFormData({ ...formData, fragranceNotes: e.target.value })}
                  placeholder="e.g. Cambodian Oud, Turkish Rose, Amber, Saffron, Smoky Birch"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-md text-xs text-slate-900 focus:outline-none transition font-sans shadow-sm"
                />
              </div>

              {/* Multi-City Initial Stock Allocation */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-xs font-medium text-slate-900 mb-2.5 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Stock by city boutique</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stores.map((st) => (
                    <div key={st.id}>
                      <label className="text-xs text-slate-500 block mb-1 font-light truncate">
                        {st.city?.name}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.storeStocks?.[st.id] ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setFormData({
                            ...formData,
                            storeStocks: {
                              ...formData.storeStocks,
                              [st.id]: val,
                            },
                          });
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-lg text-xs text-slate-900 tabular-nums focus:outline-none text-center shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  {formSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProduct ? 'Update Fragrance & Stock' : 'Save Fragrance SKU'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Quick Stock In / Inventory Receipt Modal */}
      {isStockInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-900 relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-700">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-700 font-semibold block">
                    Inventory Stock-In
                  </span>
                  <h3 className="text-base font-serif font-bold text-slate-900">
                    Add Units to Boutique
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsStockInModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alert messages */}
            {stockInError && (
              <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{stockInError}</span>
              </div>
            )}
            {stockInSuccess && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{stockInSuccess}</span>
              </div>
            )}

            <form noValidate onSubmit={handleStockInSubmit} className="mt-4 space-y-3.5">
              {/* Product Selection */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Fragrance Product <span className="text-rose-600">*</span>
                </label>
                <select
                  value={stockInProduct?.id || ''}
                  onChange={(e) => {
                    const p = products.find((prod) => prod.id === e.target.value);
                    if (p) {
                      setStockInProduct(p);
                      if (stockInFieldErrors.product) setStockInFieldErrors((prev) => ({ ...prev, product: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer border ${
                    stockInFieldErrors.product
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                  }`}
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Total: {p.stockQuantity}
                    </option>
                  ))}
                </select>
                {stockInFieldErrors.product && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{stockInFieldErrors.product}</span>
                  </p>
                )}
              </div>

              {/* Destination Outlet */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Destination Boutique / City <span className="text-rose-600">*</span>
                </label>
                <select
                  value={stockInStoreId}
                  onChange={(e) => {
                    setStockInStoreId(e.target.value);
                    if (stockInFieldErrors.store) setStockInFieldErrors((prev) => ({ ...prev, store: '' }));
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer border ${
                    stockInFieldErrors.store
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                  }`}
                >
                  <option value="">-- Select Boutique Outlet --</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.city?.name} — {s.name}
                    </option>
                  ))}
                </select>
                {stockInFieldErrors.store && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{stockInFieldErrors.store}</span>
                  </p>
                )}
              </div>

              {/* Quantity to Add & Quick Preset Pills */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">
                    Quantity to Add (Units) <span className="text-rose-600">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Current: {stockInProduct?.stockBalances?.find((b) => b.storeId === stockInStoreId)?.quantity || 0} units
                  </span>
                </div>
                <input
                  type="number"
                  value={stockInQty}
                  onChange={(e) => {
                    setStockInQty(e.target.value);
                    if (stockInFieldErrors.qty) setStockInFieldErrors((prev) => ({ ...prev, qty: '' }));
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-bold font-mono text-slate-900 focus:outline-none border ${
                    stockInFieldErrors.qty
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 focus:border-amber-500 bg-slate-50'
                  }`}
                />
                {stockInFieldErrors.qty && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-sans">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{stockInFieldErrors.qty}</span>
                  </p>
                )}

                {/* Quick Add Pills */}
                <div className="flex gap-1.5 mt-2">
                  {[5, 10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setStockInQty(preset);
                        if (stockInFieldErrors.qty) setStockInFieldErrors((prev) => ({ ...prev, qty: '' }));
                      }}
                      className={`flex-1 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                        Number(stockInQty) === preset
                          ? 'bg-amber-500 text-white border-amber-500 font-bold'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes / Reason */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Receipt Note / Batch</label>
                <input
                  type="text"
                  value={stockInNotes}
                  onChange={(e) => setStockInNotes(e.target.value)}
                  placeholder="e.g. New consignment batch #2026-B"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStockInModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockInSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
                >
                  {stockInSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{stockInSubmitting ? 'Updating Stock...' : 'Confirm Stock In'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
