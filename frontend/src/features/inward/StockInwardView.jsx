import React, { useState, useEffect } from 'react';
import {
  Truck,
  ArrowDownToLine,
  Send,
  Building2,
  Package,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  X,
  ChevronRight,
  ArrowRight,
  Layers,
  Boxes,
  MapPin,
  Receipt,
  ShieldCheck
} from 'lucide-react';
import { inwardService, productService, storeService } from '../../services/api';
import { hasPermission } from '../../utils/permissions';

export default function StockInwardView({
  currentUser,
  stores: propStores = [],
  onNavigateToProducts = null,
}) {
  const [activeTab, setActiveTab] = useState('inwards'); // 'inwards' | 'unallocated' | 'distributions'
  const [inwards, setInwards] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stores, setStores] = useState(propStores);
  const [productsCatalog, setProductsCatalog] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Selected for action
  const [selectedInward, setSelectedInward] = useState(null);

  // New Inward Form State
  const initialInwardForm = {
    supplierName: '',
    referenceNumber: '',
    inwardDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [
      {
        productId: '',
        batchNumber: '',
        quantityInwarded: 50,
        unitCost: '',
        notes: '',
      },
    ],
  };
  const [inwardForm, setInwardForm] = useState(initialInwardForm);
  const [inwardSubmitting, setInwardSubmitting] = useState(false);

  // Distribution Form State
  // { [inwardItemId]: { [storeId]: quantity } }
  const [distributionAllocations, setDistributionAllocations] = useState({});
  const [distributionNotes, setDistributionNotes] = useState('');
  const [distributeSubmitting, setDistributeSubmitting] = useState(false);

  // Load Initial Data
  useEffect(() => {
    loadAllData();
  }, [statusFilter]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const [inwRes, distRes, summRes, storesRes, prodsRes] = await Promise.all([
        inwardService.getInwards({ status: statusFilter !== 'ALL' ? statusFilter : undefined, search }),
        inwardService.getDistributions(),
        inwardService.getInwardSummary(),
        stores.length === 0 ? storeService.getStores() : Promise.resolve({ data: stores }),
        productService.getProducts({ limit: 100 }),
      ]);

      setInwards(inwRes.data || []);
      setDistributions(distRes.data || []);
      setSummary(summRes.data || null);
      if (storesRes.data?.length) setStores(storesRes.data);
      setProductsCatalog(prodsRes.data || []);
    } catch (err) {
      console.error('Failed to load Inward ERP data:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load stock inward records from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadAllData();
  };

  // Open New Inward Modal
  const handleOpenNewInwardModal = () => {
    const firstProd = productsCatalog[0];
    setInwardForm({
      ...initialInwardForm,
      items: [
        {
          productId: firstProd?.id || '',
          batchNumber: `BATCH-${new Date().getFullYear()}-01`,
          quantityInwarded: 50,
          unitCost: firstProd?.purchaseCost || '',
          notes: '',
        },
      ],
    });
    setErrorMsg('');
    setIsInwardModalOpen(true);
  };

  // Add Item Row in Inward Form
  const handleAddInwardRow = () => {
    const firstProd = productsCatalog[0];
    setInwardForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: firstProd?.id || '',
          batchNumber: `BATCH-${new Date().getFullYear()}-01`,
          quantityInwarded: 50,
          unitCost: firstProd?.purchaseCost || '',
          notes: '',
        },
      ],
    }));
  };

  // Remove Item Row
  const handleRemoveInwardRow = (index) => {
    if (inwardForm.items.length <= 1) return;
    setInwardForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  // Handle Item Row Change
  const handleInwardItemChange = (index, field, value) => {
    setInwardForm((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto fill unitCost if product changed
      if (field === 'productId') {
        const prod = productsCatalog.find((p) => p.id === value);
        if (prod && !updated[index].unitCost) {
          updated[index].unitCost = prod.purchaseCost;
        }
      }
      return { ...prev, items: updated };
    });
  };

  // Submit Inward Form
  const handleInwardSubmit = async (e) => {
    e.preventDefault();
    try {
      setInwardSubmitting(true);
      setErrorMsg('');

      const res = await inwardService.createInward(inwardForm);
      if (res.success) {
        setSuccessMsg(`Consignment '${res.data?.inwardNumber}' received into Central Vault!`);
        setIsInwardModalOpen(false);
        await loadAllData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to record stock inward.');
    } finally {
      setInwardSubmitting(false);
    }
  };

  // Helper to get current shelf stock for a product at a specific boutique store
  const getStoreCurrentStock = (productId, storeId) => {
    // 1. Check in full products catalog
    const catalogProd = productsCatalog.find((p) => p.id === productId);
    if (catalogProd?.stockBalances && Array.isArray(catalogProd.stockBalances)) {
      const bal = catalogProd.stockBalances.find((b) => b.storeId === storeId);
      if (bal !== undefined && bal.quantity !== undefined) {
        return Number(bal.quantity) || 0;
      }
    }

    // 2. Fallback: check selected inward item's product stockBalances
    const inwItem = selectedInward?.items?.find((it) => it.productId === productId);
    if (inwItem?.product?.stockBalances && Array.isArray(inwItem.product.stockBalances)) {
      const bal = inwItem.product.stockBalances.find((b) => b.storeId === storeId);
      if (bal !== undefined && bal.quantity !== undefined) {
        return Number(bal.quantity) || 0;
      }
    }

    return 0;
  };

  // Open Distribute Modal for an Inward
  const handleOpenDistributeModal = async (inward) => {
    // Refresh products catalog in background to ensure up-to-the-minute stock balances
    try {
      const prodsRes = await productService.getProducts({ limit: 100 });
      if (prodsRes.data) setProductsCatalog(prodsRes.data);
    } catch (e) {
      // ignore
    }

    setSelectedInward(inward);
    const initialAlloc = {};
    inward.items.forEach((item) => {
      initialAlloc[item.id] = {};
      stores.forEach((st) => {
        initialAlloc[item.id][st.id] = 0;
      });
    });
    setDistributionAllocations(initialAlloc);
    setDistributionNotes(`Location distribution from consignment ${inward.inwardNumber}`);
    setErrorMsg('');
    setIsDistributeModalOpen(true);
  };

  // Quick Distribute Evenly across stores
  const handleDistributeEvenly = (inwardItem) => {
    const available = Math.max(0, inwardItem.quantityInwarded - inwardItem.quantityDistributed);
    if (available <= 0 || stores.length === 0) return;

    const share = Math.floor(available / stores.length);
    const remainder = available % stores.length;

    setDistributionAllocations((prev) => {
      const itemAlloc = { ...(prev[inwardItem.id] || {}) };
      stores.forEach((st, idx) => {
        itemAlloc[st.id] = share + (idx === 0 ? remainder : 0);
      });
      return { ...prev, [inwardItem.id]: itemAlloc };
    });
  };

  // Clear allocations for an item
  const handleClearAllocation = (inwardItemId) => {
    setDistributionAllocations((prev) => {
      const itemAlloc = { ...(prev[inwardItemId] || {}) };
      Object.keys(itemAlloc).forEach((k) => { itemAlloc[k] = 0; });
      return { ...prev, [inwardItemId]: itemAlloc };
    });
  };

  // Submit Distribution Form
  const handleDistributeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInward) return;

    try {
      setDistributeSubmitting(true);
      setErrorMsg('');

      // Prepare payload
      const distributionsPayload = [];
      Object.entries(distributionAllocations).forEach(([inwardItemId, storeMap]) => {
        const item = selectedInward.items.find((it) => it.id === inwardItemId);
        if (item) {
          distributionsPayload.push({
            inwardItemId,
            productId: item.productId,
            allocations: storeMap,
          });
        }
      });

      const res = await inwardService.distributeStock(selectedInward.id, {
        notes: distributionNotes.trim(),
        distributions: distributionsPayload,
      });

      if (res.success) {
        setSuccessMsg(`Distribution '${res.data?.distributionNumber}' dispatched to boutique locations!`);
        setIsDistributeModalOpen(false);
        setSelectedInward(null);
        await loadAllData();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to distribute stock to locations.');
    } finally {
      setDistributeSubmitting(false);
    }
  };

  // Open Details Modal
  const handleOpenDetailsModal = async (inward) => {
    try {
      const res = await inwardService.getInwardById(inward.id);
      setSelectedInward(res.data || inward);
      setIsDetailsModalOpen(true);
    } catch (err) {
      setSelectedInward(inward);
      setIsDetailsModalOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/10 text-amber-700 rounded-lg">
              <Boxes className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
              Stock Inward & Multi-Location Distribution
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
            Central distillery intake workflow: Receive factory shipments into Central Vault first, inspect batches, and distribute stock across boutique counters.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={loadAllData}
            title="Refresh Inward Data"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            onClick={handleOpenNewInwardModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold tracking-wide transition shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Stock Inward (GRN)</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Central Vault Stock (Awaiting Distribution) */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800">
              Central Vault (Awaiting Distribution)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-300 text-amber-700 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-950">
            {summary?.totalUnallocatedUnits ?? 0}
            <span className="text-xs font-sans font-medium text-amber-700 ml-1.5">units</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">
            Ready to distribute to retail locations
          </div>
        </div>

        {/* Card 2: Boutique Shelf Stock */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Distributed in Outlets
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {summary?.totalDistributedUnits ?? 0}
            <span className="text-xs font-sans font-medium text-slate-500 ml-1.5">units</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Sitting on counters across {stores.length} boutiques
          </div>
        </div>

        {/* Card 3: Total Inward Consignments */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Inward Consignments
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {summary?.totalInwardsCount ?? inwards.length}
            <span className="text-xs font-sans font-medium text-slate-500 ml-1.5">receipts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {summary?.pendingConsignmentsCount || 0} pending full distribution
          </div>
        </div>

        {/* Card 4: Inward Valuation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Inward Valuation
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            ₹{Number(summary?.totalInwardValuation || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700 font-medium">
            Total goods received at purchase cost
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-1">
        <div className="flex items-center gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inwards')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 -mb-px flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'inwards'
                ? 'border-amber-500 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4 text-amber-600" />
            <span>Inward Consignments (GRN)</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px]">
              {inwards.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('unallocated')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 -mb-px flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'unallocated'
                ? 'border-amber-500 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-600" />
            <span>Awaiting Distribution</span>
            {summary?.productsWithUnallocated?.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                {summary.productsWithUnallocated.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('distributions')}
            className={`pb-2.5 text-xs sm:text-sm font-semibold transition border-b-2 -mb-px flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'distributions'
                ? 'border-amber-500 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4 text-blue-600" />
            <span>Distribution History (Dispatches)</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px]">
              {distributions.length}
            </span>
          </button>
        </div>

        {/* Tab-level filters for Inwards */}
        {activeTab === 'inwards' && (
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none cursor-pointer shadow-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="RECEIVED">Received (Pending)</option>
              <option value="PARTIALLY_DISTRIBUTED">Partially Distributed</option>
              <option value="FULLY_DISTRIBUTED">Fully Distributed</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: INWARDS LIST */}
      {activeTab === 'inwards' && (
        <div className="space-y-4">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Inward #, Supplier, DC, or Batch..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-xs"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Inwards Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4">Inward Number</th>
                    <th className="py-3 px-4">Supplier / Distillery</th>
                    <th className="py-3 px-4">Date & Ref</th>
                    <th className="py-3 px-4 text-center">Items & Units</th>
                    <th className="py-3 px-4">Distribution Progress</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2" />
                        <span>Loading inward consignments...</span>
                      </td>
                    </tr>
                  ) : inwards.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-16 text-center text-slate-400">
                        <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-serif text-sm text-slate-600 font-semibold">No inward consignments found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Click "+ New Stock Inward" to record your first consignment intake.</p>
                      </td>
                    </tr>
                  ) : (
                    inwards.map((inw) => {
                      const isFullyDistributed = inw.status === 'FULLY_DISTRIBUTED';
                      const isPartially = inw.status === 'PARTIALLY_DISTRIBUTED';
                      const pct = inw.totalQuantity > 0 
                        ? Math.min(100, Math.round(((inw.distributedQuantity || 0) / inw.totalQuantity) * 100))
                        : 0;

                      return (
                        <tr key={inw.id} className="hover:bg-slate-50/70 transition">
                          
                          {/* Inward Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Receipt className="w-3.5 h-3.5 text-amber-600" />
                              <span>{inw.inwardNumber}</span>
                            </span>
                          </td>

                          {/* Supplier */}
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="font-semibold">{inw.supplierName}</div>
                            {inw.notes && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">{inw.notes}</div>
                            )}
                          </td>

                          {/* Date & Ref */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono text-slate-800">
                              {new Date(inw.inwardDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Ref: {inw.referenceNumber || 'N/A'}
                            </div>
                          </td>

                          {/* Items & Units */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="font-bold text-slate-900 font-mono">
                              {inw.totalQuantity} <span className="font-sans font-normal text-slate-500 text-[11px]">units</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {inw.totalItems} product SKU(s)
                            </div>
                          </td>

                          {/* Distribution Progress Bar */}
                          <td className="py-3.5 px-4 min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                              <span className="text-emerald-700 font-semibold">{inw.distributedQuantity || 0} dist.</span>
                              <span className="text-amber-800 font-semibold">{inw.pendingQuantity || 0} left</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isFullyDistributed
                                    ? 'bg-emerald-500'
                                    : isPartially
                                    ? 'bg-amber-500'
                                    : 'bg-slate-300'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>

                          {/* Total Cost */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            ₹{Number(inw.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isFullyDistributed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isPartially
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {isFullyDistributed ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Fully Allocated</span>
                                </>
                              ) : isPartially ? (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Partially Dist.</span>
                                </>
                              ) : (
                                <>
                                  <Boxes className="w-3 h-3 text-blue-600" />
                                  <span>In Central Vault</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Distribute Button */}
                              <button
                                onClick={() => handleOpenDistributeModal(inw)}
                                disabled={isFullyDistributed}
                                title={isFullyDistributed ? 'Fully distributed to locations' : 'Distribute stock to boutique locations'}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                                  isFullyDistributed
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs'
                                }`}
                              >
                                <Send className="w-3 h-3 text-amber-700" />
                                <span>Distribute</span>
                              </button>

                              {/* View Details Button */}
                              <button
                                onClick={() => handleOpenDetailsModal(inw)}
                                title="Inspect Inward Consignment Details"
                                className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 2: UNALLOCATED CENTRAL STOCK */}
      {activeTab === 'unallocated' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <Boxes className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Central Vault Unallocated Inventory</p>
              <p className="mt-0.5 text-amber-800">
                These luxury fragrance units were inwarded from distilleries but have not yet been assigned to any boutique retail counter. Distribute them below to make them sellable at POS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {summary?.productsWithUnallocated?.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-serif text-sm font-bold text-slate-800">All Inwarded Stock Has Been Distributed!</p>
                <p className="text-xs text-slate-400 mt-1">There are currently no unallocated units waiting in the Central Vault.</p>
              </div>
            ) : (
              summary?.productsWithUnallocated?.map((prod) => (
                <div key={prod.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block">
                          {prod.category?.name || 'Fragrance'}
                        </span>
                        <h4 className="font-serif font-bold text-slate-900 text-sm truncate">{prod.name}</h4>
                        <span className="text-[11px] font-mono text-slate-400">{prod.sku} · {prod.volumeMl}ml</span>
                      </div>
                    </div>

                    <div className="mt-3 p-2.5 bg-amber-50 rounded-xl border border-amber-200/80">
                      <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                        Awaiting Location Distribution
                      </div>
                      <div className="text-xl font-bold font-mono text-amber-950 mt-0.5">
                        {prod.unallocatedStock} <span className="text-xs font-sans font-medium text-amber-700">units</span>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 flex justify-between font-mono">
                      <span>In Outlets Shelf:</span>
                      <span className="font-semibold text-slate-800">{prod.stockQuantity} units</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        // Find an inward containing this product
                        const inw = inwards.find((i) => i.items.some((it) => it.productId === prod.id && (it.quantityInwarded - it.quantityDistributed) > 0));
                        if (inw) {
                          handleOpenDistributeModal(inw);
                        } else if (inwards[0]) {
                          handleOpenDistributeModal(inwards[0]);
                        } else {
                          setErrorMsg('No open inward consignment found for this product. Record a new inward first.');
                        }
                      }}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Distribute to Outlets</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DISTRIBUTION HISTORY */}
      {activeTab === 'distributions' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                  <th className="py-3 px-4">Dispatch Number</th>
                  <th className="py-3 px-4">From Inward Consignment</th>
                  <th className="py-3 px-4">Dispatch Date</th>
                  <th className="py-3 px-4">Destination Boutiques & Allocations</th>
                  <th className="py-3 px-4 text-center">Total Units</th>
                  <th className="py-3 px-4">Dispatched By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {distributions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-slate-400">
                      <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-serif text-sm font-semibold text-slate-600">No distribution dispatches recorded</p>
                      <p className="text-xs text-slate-400 mt-0.5">Distribute inward stock to see location transfer history here.</p>
                    </td>
                  </tr>
                ) : (
                  distributions.map((dist) => (
                    <tr key={dist.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-blue-700">
                          <Send className="w-3.5 h-3.5" />
                          <span>{dist.distributionNumber}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {dist.inward ? (
                          <div>
                            <div>{dist.inward.inwardNumber}</div>
                            <div className="text-[11px] font-sans text-slate-400 font-normal">{dist.inward.supplierName}</div>
                          </div>
                        ) : 'Direct Intake'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                        {new Date(dist.distributionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {dist.items?.map((it, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px]"
                            >
                              <span className="font-semibold text-slate-900">{it.store?.city?.name || it.store?.name}:</span>
                              <span className="font-mono font-bold text-amber-700">+{it.quantity}</span>
                              <span className="text-[10px] text-slate-400">({it.product?.name})</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                        {dist.totalQuantity} <span className="text-[11px] font-sans font-normal text-slate-500">units</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {dist.createdBy?.name || 'Manager'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: NEW STOCK INWARD (GRN) */}
      {isInwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto text-slate-900 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-300 text-amber-700 flex items-center justify-center">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 block">
                    Goods Receipt Note (GRN)
                  </span>
                  <h3 className="text-lg font-serif font-bold text-slate-900">
                    Receive Inward Consignment to Central Vault
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsInwardModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInwardSubmit} className="mt-5 space-y-5">
              
              {/* Header Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Distillery / Supplier / Source *
                  </label>
                  <input
                    type="text"
                    required
                    value={inwardForm.supplierName}
                    onChange={(e) => setInwardForm({ ...inwardForm, supplierName: e.target.value })}
                    placeholder="e.g. JJ Grasse Distillery / Kannauj Unit"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Delivery Challan / Invoice Ref No
                  </label>
                  <input
                    type="text"
                    value={inwardForm.referenceNumber}
                    onChange={(e) => setInwardForm({ ...inwardForm, referenceNumber: e.target.value })}
                    placeholder="e.g. DC-98421 / INV-2026-B"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Inward Receipt Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={inwardForm.inwardDate}
                    onChange={(e) => setInwardForm({ ...inwardForm, inwardDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Line Items Container */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>Fragrance Products in Consignment ({inwardForm.items.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInwardRow}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-amber-700 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="p-3 space-y-3">
                  {inwardForm.items.map((row, idx) => {
                    const lineTotal = (Number(row.unitCost || 0) * (parseInt(row.quantityInwarded, 10) || 0)).toFixed(2);

                    return (
                      <div key={idx} className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Product Picker */}
                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Fragrance Product *
                          </label>
                          <select
                            value={row.productId}
                            required
                            onChange={(e) => handleInwardItemChange(idx, 'productId', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-lg text-xs text-slate-900 focus:outline-none cursor-pointer"
                          >
                            {productsCatalog.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku} · {p.volumeMl}ml)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Batch Number */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Batch #
                          </label>
                          <input
                            type="text"
                            value={row.batchNumber}
                            onChange={(e) => handleInwardItemChange(idx, 'batchNumber', e.target.value)}
                            placeholder="BATCH-01"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:outline-none"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Inward Qty *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={row.quantityInwarded}
                            onChange={(e) => handleInwardItemChange(idx, 'quantityInwarded', Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono font-bold focus:outline-none text-center"
                          />
                        </div>

                        {/* Unit Purchase Cost */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                            Unit Cost (₹)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.unitCost}
                            onChange={(e) => handleInwardItemChange(idx, 'unitCost', e.target.value)}
                            placeholder="0.00"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono focus:outline-none text-right"
                          />
                        </div>

                        {/* Line Total & Remove Action */}
                        <div className="sm:col-span-2 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total (₹)</span>
                            <span className="text-xs font-bold font-mono text-slate-900">₹{Number(lineTotal).toLocaleString('en-IN')}</span>
                          </div>

                          {inwardForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInwardRow(idx)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Remove line"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Consignment Inspection Notes / Remarks
                </label>
                <input
                  type="text"
                  value={inwardForm.notes}
                  onChange={(e) => setInwardForm({ ...inwardForm, notes: e.target.value })}
                  placeholder="e.g. Received in distillery tamper-proof crates. Quality check approved."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {/* Form Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600 font-mono">
                  Total Units: <strong className="text-slate-900 font-bold">{inwardForm.items.reduce((s, it) => s + (parseInt(it.quantityInwarded, 10) || 0), 0)} units</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInwardModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={inwardSubmitting}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    {inwardSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Inward to Central Vault</span>
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: DISTRIBUTE STOCK TO BOUTIQUE LOCATIONS */}
      {isDistributeModalOpen && selectedInward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto text-slate-900 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-300 text-blue-700 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700 block">
                    Location Dispatch Allocation
                  </span>
                  <h3 className="text-lg font-serif font-bold text-slate-900">
                    Distribute Consignment {selectedInward.inwardNumber} to Boutiques
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setIsDistributeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDistributeSubmit} className="mt-5 space-y-6">
              
              {/* Consignment summary banner */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Consignment Source</span>
                  <span className="font-semibold text-slate-900">{selectedInward.supplierName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Inward Date</span>
                  <span className="font-mono text-slate-800">{new Date(selectedInward.inwardDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Inwarded</span>
                  <span className="font-mono font-bold text-slate-900">{selectedInward.totalQuantity} units</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Already Distributed</span>
                  <span className="font-mono font-bold text-emerald-700">{selectedInward.distributedQuantity || 0} units</span>
                </div>
              </div>

              {/* Items Allocation Grid */}
              <div className="space-y-4">
                {selectedInward.items.map((item) => {
                  const available = Math.max(0, item.quantityInwarded - item.quantityDistributed);
                  const currentAlloc = distributionAllocations[item.id] || {};
                  const allocatedSum = Object.values(currentAlloc).reduce((sum, q) => sum + (parseInt(q, 10) || 0), 0);
                  const remaining = available - allocatedSum;
                  const isExceeded = remaining < 0;

                  return (
                    <div key={item.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                      
                      {/* Item header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-serif font-bold text-xs">
                            JJ
                          </div>
                          <div>
                            <h4 className="font-serif font-bold text-slate-900 text-sm">{item.product?.name}</h4>
                            <span className="text-[11px] font-mono text-slate-400">
                              {item.product?.sku} · {item.batchNumber ? `Batch: ${item.batchNumber}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Allocation Counters */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-500">
                            Available: <strong className="text-slate-900">{available}</strong>
                          </span>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                            isExceeded
                              ? 'bg-rose-100 text-rose-800'
                              : remaining === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isExceeded ? `Exceeded by ${Math.abs(remaining)}` : `Remaining: ${remaining}`}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleDistributeEvenly(item)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition"
                          >
                            Distribute Evenly
                          </button>
                        </div>
                      </div>

                      {/* Store inputs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {stores.map((st) => {
                          const currentStock = getStoreCurrentStock(item.productId, st.id);
                          const allocQty = parseInt(currentAlloc[st.id], 10) || 0;
                          return (
                            <div key={st.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                              <label className="text-[11px] font-bold text-slate-700 block truncate" title={st.name}>
                                {st.city?.name || st.name} Boutique
                              </label>
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
                                <span>Current shelf:</span>
                                <strong className="text-slate-900 font-bold">{currentStock} units</strong>
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={currentAlloc[st.id] ?? 0}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setDistributionAllocations((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...(prev[item.id] || {}),
                                      [st.id]: val,
                                    },
                                  }));
                                }}
                                className="w-full px-2 py-1 bg-white border border-slate-200 focus:border-blue-500 rounded-lg text-xs font-mono font-bold text-slate-900 text-center"
                              />
                              {allocQty > 0 && (
                                <div className="text-[10px] font-mono text-emerald-700 font-medium text-right mt-1">
                                  → New shelf: <strong>{currentStock + allocQty}</strong>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Dispatch Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Dispatch Vehicle / Transfer Notes
                </label>
                <input
                  type="text"
                  value={distributionNotes}
                  onChange={(e) => setDistributionNotes(e.target.value)}
                  placeholder="e.g. Courier consignment / Boutique van transfer order"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              {/* Modal footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={distributeSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  {distributeSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Dispatch & Update Location Stocks</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: INWARD DETAILS / CHALLAN VIEW */}
      {isDetailsModalOpen && selectedInward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto text-slate-900 relative">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                  Official Inward Record
                </span>
                <h3 className="text-xl font-serif font-bold text-slate-900">
                  {selectedInward.inwardNumber}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5 text-xs">
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Distillery / Source</span>
                  <span className="font-semibold text-slate-900">{selectedInward.supplierName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">DC / Invoice Ref</span>
                  <span className="font-mono text-slate-800">{selectedInward.referenceNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Inward Date</span>
                  <span className="font-mono text-slate-800">{new Date(selectedInward.inwardDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Recorded By</span>
                  <span className="text-slate-800">{selectedInward.createdBy?.name || 'Admin'}</span>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Inward Items Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3">Batch</th>
                        <th className="py-2.5 px-3 text-center">Inwarded</th>
                        <th className="py-2.5 px-3 text-center">Distributed</th>
                        <th className="py-2.5 px-3 text-center">Pending</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInward.items?.map((it) => (
                        <tr key={it.id}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{it.product?.name} ({it.product?.sku})</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{it.batchNumber || '—'}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{it.quantityInwarded}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-semibold">{it.quantityDistributed}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-amber-800 font-bold">{Math.max(0, it.quantityInwarded - it.quantityDistributed)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{Number(it.unitCost).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">₹{Number(it.totalCost).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Distribution History */}
              {selectedInward.distributions && selectedInward.distributions.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Location Dispatches from this Inward</h4>
                  <div className="space-y-2">
                    {selectedInward.distributions.map((d) => (
                      <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-mono font-bold text-blue-700">{d.distributionNumber}</div>
                          <div className="text-[11px] text-slate-500">{new Date(d.distributionDate).toLocaleDateString()} · {d.notes}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900">{d.totalQuantity} units</span>
                          <span className="text-[10px] text-slate-400 block">allocated to boutiques</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
