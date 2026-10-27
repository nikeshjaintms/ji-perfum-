import React, { useState, useEffect } from 'react';
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
  MapPin
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

  // Form State
  const initialForm = {
    name: '',
    sku: '',
    barcode: '',
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

  const handleOpenQuickStockIn = (product = null) => {
    const prod = product || products[0];
    setStockInProduct(prod);
    setStockInStoreId(stores[0]?.id || '');
    setStockInQty(25);
    setStockInNotes('Stock receipt from distillery / warehouse');
    setStockInSuccess('');
    setStockInError('');
    setIsStockInModalOpen(true);
  };

  const handleStockInSubmit = async (e) => {
    e.preventDefault();
    if (!stockInProduct || !stockInStoreId || !stockInQty) {
      setStockInError('Please select a product, outlet, and valid quantity.');
      return;
    }

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
    });
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
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setFormSubmitting(true);
      setErrorMsg('');

      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, formData);
      } else {
        await productService.createProduct(formData);
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2 text-[10px] uppercase tracking-[0.2em] text-amber-700 font-semibold mb-1">
            <span>Inventory Architecture</span>
            <span>•</span>
            <span>Multi-Boutique Ledger</span>
          </div>
          <h2 className="text-2xl font-serif text-slate-900 tracking-tight flex items-center space-x-2.5">
            <span className="w-1.5 h-5 bg-gradient-to-b from-amber-500 to-amber-700 rounded-full inline-block" />
            <span>Fragrance Vault & Stock Balances</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-light">
            Real-time multi-city balance ledger across Mandvi, Mumbai, Delhi, and Bengaluru boutiques.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, barcode, notes..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition font-sans shadow-sm"
            />
          </form>

          {/* Quick Stock In Button */}
          <button
            onClick={() => handleOpenQuickStockIn()}
            id="quick-stock-in-btn"
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-semibold tracking-wide transition flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-700" />
            <span>+ Add Stock In</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 rounded-full text-xs font-semibold tracking-wide transition shadow-md shadow-amber-500/20 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Fragrance SKU</span>
          </button>
        </div>
      </div>

      {/* Categories Filter Tabs */}
      <div className="flex items-center space-x-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all duration-150 ${
            selectedCategory === 'ALL'
              ? 'bg-amber-500 text-slate-950 border border-amber-500 shadow-sm font-semibold'
              : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          All Fragrances
        </button>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border border-amber-500 shadow-sm font-semibold'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              {cat.name} ({cat._count?.products || 0})
            </button>
          );
        })}
      </div>

      {/* Products Table with City Stock Columns */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] tracking-[0.16em] uppercase text-slate-500 bg-slate-50/80 font-semibold">
                <th className="py-3.5 px-4 font-normal">Fragrance Creation</th>
                <th className="py-3.5 px-4 font-normal">SKU / Barcode</th>
                <th className="py-3.5 px-4 font-normal">Collection</th>
                <th className="py-3.5 px-4 text-right font-normal">M.R.P.</th>
                <th className="py-3.5 px-4 font-normal">City Stock Allocation</th>
                <th className="py-3.5 px-4 text-center font-normal">Network Total</th>
                <th className="py-3.5 px-4 text-center font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2.5 opacity-80" />
                    <span className="text-xs tracking-wider uppercase text-slate-500 font-light">Loading vault catalog...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-500">
                    <Package className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-40" />
                    <p className="font-light text-sm text-slate-500">No fragrances found.</p>
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                      
                      {/* Name & Notes */}
                      <td className="py-3.5 px-4">
                        <div className="font-serif font-medium text-slate-900 text-sm">{prod.name}</div>
                        <div className="text-[10px] text-amber-700 uppercase font-medium tracking-wider mt-0.5">
                          {prod.concentration?.replace(/_/g, ' ')} • {prod.volumeMl}ml
                        </div>
                        {prod.fragranceNotes && (
                          <div className="text-[10px] text-slate-500 font-light italic mt-0.5 truncate max-w-xs">
                            {prod.fragranceNotes}
                          </div>
                        )}
                      </td>

                      {/* SKU & Barcode */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="text-slate-900 font-medium flex items-center space-x-1.5">
                          <Tag className="w-3 h-3 text-amber-600" />
                          <span>{prod.sku}</span>
                        </div>
                        {prod.barcode && (
                          <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5 font-light">
                            <Barcode className="w-3 h-3 text-slate-400" />
                            <span>{prod.barcode}</span>
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700 text-[10px] font-medium tracking-wide">
                          {prod.category?.name || 'Fragrance'}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 text-sm whitespace-nowrap">
                        ₹{Number(prod.sellingPrice).toFixed(2)}
                      </td>

                      {/* City-Wise Stock Allocation Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {prod.stockBalances && prod.stockBalances.length > 0 ? (
                            prod.stockBalances.map((bal) => {
                              const q = bal.quantity;
                              const cityName = bal.store?.city?.name || bal.store?.name?.split(' ')[0] || 'Store';
                              return (
                                <span 
                                  key={bal.id || bal.storeId}
                                  className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
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
                            <span className="text-slate-400 text-[10px] font-light">No stock recorded</span>
                          )}
                        </div>
                      </td>

                      {/* Total Network Stock */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span>{prod.stockQuantity}</span>
                          <span className="text-[10px] opacity-75 font-sans">units</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleOpenQuickStockIn(prod)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition flex items-center space-x-1 cursor-pointer"
                            title="Add / Receive Stock In"
                          >
                            <Plus className="w-3 h-3 text-emerald-700" />
                            <span>Stock In</span>
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition cursor-pointer"
                            title="Edit Fragrance & City Stock"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add / Edit Product Modal with Multi-City Stock Inputs */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-900">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-amber-700 font-semibold block">Catalog Record</span>
                  <h3 className="text-base font-serif text-slate-900 tracking-wide">
                    {editingProduct ? 'Edit Fragrance Creation' : 'Add New Fragrance SKU'}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Fragrance Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. JJ Royal Oud Extreme"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. JJ-OUD-EXT"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 font-mono focus:outline-none transition shadow-sm"
                  />
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 font-mono focus:outline-none transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer shadow-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id} className="bg-white text-slate-900">
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Concentration</label>
                  <select
                    value={formData.concentration}
                    onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer shadow-sm"
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
                    onChange={(e) => setFormData({ ...formData, volumeMl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 font-mono focus:outline-none transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 font-mono focus:outline-none transition shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 font-mono focus:outline-none transition shadow-sm"
                  />
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none transition font-sans shadow-sm"
                />
              </div>

              {/* Multi-City Initial Stock Allocation */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="text-xs font-medium text-slate-900 mb-2.5 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>City-Wise Boutique Stock Allocation</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {stores.map((st) => (
                    <div key={st.id}>
                      <label className="text-[11px] text-slate-500 block mb-1 font-light truncate">
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
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-lg text-xs text-slate-900 font-mono focus:outline-none text-center shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 rounded-full text-xs font-semibold tracking-wide transition shadow-md shadow-amber-500/25 flex items-center space-x-1.5"
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

            <form onSubmit={handleStockInSubmit} className="mt-4 space-y-3.5">
              {/* Product Selection */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Fragrance Product *</label>
                <select
                  value={stockInProduct?.id || ''}
                  onChange={(e) => {
                    const p = products.find((prod) => prod.id === e.target.value);
                    if (p) setStockInProduct(p);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Total: {p.stockQuantity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Outlet */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Destination Boutique / City *</label>
                <select
                  value={stockInStoreId}
                  onChange={(e) => setStockInStoreId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.city?.name} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity to Add & Quick Preset Pills */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Quantity to Add (Units) *</label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Current: {stockInProduct?.stockBalances?.find((b) => b.storeId === stockInStoreId)?.quantity || 0} units
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockInQty}
                  onChange={(e) => setStockInQty(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-sm font-bold font-mono text-slate-900 focus:outline-none"
                />

                {/* Quick Add Pills */}
                <div className="flex gap-1.5 mt-2">
                  {[5, 10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStockInQty(preset)}
                      className={`flex-1 py-1 text-[11px] font-mono rounded-lg border transition cursor-pointer ${
                        stockInQty === preset
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
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
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 text-white rounded-full text-xs font-semibold tracking-wide transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
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
