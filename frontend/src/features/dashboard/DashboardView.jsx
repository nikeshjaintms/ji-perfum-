import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Percent,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Sparkles,
  Printer,
  Package,
} from 'lucide-react';
import { dashboardService } from '../../services/api';
import { hasPermission } from '../../utils/permissions';

import StatCard, { formatIndianCurrency } from './components/StatCard';
import DateRangePicker from './components/DateRangePicker';
import StoreSwitcher from './components/StoreSwitcher';
import SalesTrendChart from './components/SalesTrendChart';
import PaymentDonut from './components/PaymentDonut';
import CategorySalesChart from './components/CategorySalesChart';
import TopProductsList from './components/TopProductsList';
import StorePerformanceChart from './components/StorePerformanceChart';
import StaffPerformanceTable from './components/StaffPerformanceTable';
import LowStockTable from './components/LowStockTable';
import DuesTable from './components/DuesTable';
import RecentInvoicesTable from './components/RecentInvoicesTable';
import RecentActivityFeed from './components/RecentActivityFeed';
import DashboardQuickActions from './components/DashboardQuickActions';

export default function DashboardView({
  currentUser,
  stores = [],
  selectedStore,
  onSelectStore,
  onNavigateTab,
  onOpenDuePaymentModal,
  onOpenQuickStockInModal,
  onOpenViewInvoiceModal,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state synchronization
  const initialRange = searchParams.get('range') || '30d';
  const initialFrom = searchParams.get('from') || '';
  const initialTo = searchParams.get('to') || '';
  const initialStoreId = searchParams.get('storeId') || (selectedStore?.id || 'ALL');

  const [dateRange, setDateRange] = useState({
    range: initialRange,
    from: initialFrom,
    to: initialTo,
  });
  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Widget States (Loaded independently so one failure never crashes the page)
  const [summary, setSummary] = useState({ data: null, loading: true, error: null });
  const [salesTrend, setSalesTrend] = useState({ data: [], loading: true, error: null });
  const [paymentMethods, setPaymentMethods] = useState({ data: [], loading: true, error: null });
  const [topProducts, setTopProducts] = useState({ data: { byQuantity: [], byRevenue: [] }, loading: true, error: null });
  const [categorySales, setCategorySales] = useState({ data: [], loading: true, error: null });
  const [storePerformance, setStorePerformance] = useState({ data: [], loading: true, error: null });
  const [staffPerformance, setStaffPerformance] = useState({ data: [], loading: true, error: null });
  const [lowStock, setLowStock] = useState({ data: [], loading: true, error: null });
  const [inventoryValue, setInventoryValue] = useState({ data: null, loading: true, error: null });
  const [recentInvoices, setRecentInvoices] = useState({ data: [], loading: true, error: null });
  const [pendingDues, setPendingDues] = useState({ data: [], loading: true, error: null });
  const [recentActivity, setRecentActivity] = useState({ data: [], loading: true, error: null });

  // Update query params in URL
  const updateFilters = (newRange, newStoreId) => {
    const params = new URLSearchParams();
    if (newRange.range) params.set('range', newRange.range);
    if (newRange.from) params.set('from', newRange.from);
    if (newRange.to) params.set('to', newRange.to);
    if (newStoreId && newStoreId !== 'ALL') params.set('storeId', newStoreId);
    setSearchParams(params, { replace: true });
  };

  const handleRangeChange = (newRange) => {
    setDateRange(newRange);
    updateFilters(newRange, selectedStoreId);
  };

  const handleStoreChange = (newStoreId) => {
    setSelectedStoreId(newStoreId);
    if (onSelectStore) {
      const match = stores.find((s) => s.id === newStoreId);
      onSelectStore(match || null);
    }
    updateFilters(dateRange, newStoreId);
  };

  // Base parameters for API requests
  const getParams = useCallback(() => {
    const p = { range: dateRange.range };
    if (dateRange.from) p.from = dateRange.from;
    if (dateRange.to) p.to = dateRange.to;
    if (selectedStoreId && selectedStoreId !== 'ALL') p.storeId = selectedStoreId;
    return p;
  }, [dateRange, selectedStoreId]);

  // Loaders
  const loadSummary = useCallback(async () => {
    setSummary((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getSummary(getParams());
      if (res.success) setSummary({ data: res.data, loading: false, error: null });
    } catch (err) {
      setSummary({ data: null, loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadSalesTrend = useCallback(async () => {
    setSalesTrend((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getSalesTrend(getParams());
      if (res.success) setSalesTrend({ data: res.data, loading: false, error: null });
    } catch (err) {
      setSalesTrend({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadPaymentMethods = useCallback(async () => {
    setPaymentMethods((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getPaymentMethods(getParams());
      if (res.success) setPaymentMethods({ data: res.data, loading: false, error: null });
    } catch (err) {
      setPaymentMethods({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadTopProducts = useCallback(async () => {
    setTopProducts((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getTopProducts(getParams());
      if (res.success) setTopProducts({ data: res.data, loading: false, error: null });
    } catch (err) {
      setTopProducts({ data: { byQuantity: [], byRevenue: [] }, loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadCategorySales = useCallback(async () => {
    setCategorySales((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getCategorySales(getParams());
      if (res.success) setCategorySales({ data: res.data, loading: false, error: null });
    } catch (err) {
      setCategorySales({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadStorePerformance = useCallback(async () => {
    if (currentUser?.role !== 'SUPER_ADMIN') return;
    setStorePerformance((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getStorePerformance(getParams());
      if (res.success) setStorePerformance({ data: res.data, loading: false, error: null });
    } catch (err) {
      setStorePerformance({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams, currentUser]);

  const loadStaffPerformance = useCallback(async () => {
    setStaffPerformance((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getStaffPerformance(getParams());
      if (res.success) setStaffPerformance({ data: res.data, loading: false, error: null });
    } catch (err) {
      setStaffPerformance({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadLowStock = useCallback(async () => {
    setLowStock((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getLowStock(getParams());
      if (res.success) setLowStock({ data: res.data, loading: false, error: null });
    } catch (err) {
      setLowStock({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadInventoryValue = useCallback(async () => {
    setInventoryValue((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getInventoryValue(getParams());
      if (res.success) setInventoryValue({ data: res.data, loading: false, error: null });
    } catch (err) {
      setInventoryValue({ data: null, loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadRecentInvoices = useCallback(async () => {
    setRecentInvoices((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getRecentInvoices(getParams());
      if (res.success) setRecentInvoices({ data: res.data, loading: false, error: null });
    } catch (err) {
      setRecentInvoices({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadPendingDues = useCallback(async () => {
    setPendingDues((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getPendingDues(getParams());
      if (res.success) setPendingDues({ data: res.data, loading: false, error: null });
    } catch (err) {
      setPendingDues({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  const loadRecentActivity = useCallback(async () => {
    setRecentActivity((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await dashboardService.getRecentActivity(getParams());
      if (res.success) setRecentActivity({ data: res.data, loading: false, error: null });
    } catch (err) {
      setRecentActivity({ data: [], loading: false, error: err?.response?.data?.message || err.message });
    }
  }, [getParams]);

  // Master refresh trigger
  const refreshAll = useCallback(() => {
    loadSummary();
    loadSalesTrend();
    loadPaymentMethods();
    loadTopProducts();
    loadCategorySales();
    loadStorePerformance();
    loadStaffPerformance();
    loadLowStock();
    loadInventoryValue();
    loadRecentInvoices();
    loadPendingDues();
    loadRecentActivity();
  }, [
    loadSummary,
    loadSalesTrend,
    loadPaymentMethods,
    loadTopProducts,
    loadCategorySales,
    loadStorePerformance,
    loadStaffPerformance,
    loadLowStock,
    loadInventoryValue,
    loadRecentInvoices,
    loadPendingDues,
    loadRecentActivity,
  ]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh interval (60s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refreshAll();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshAll]);

  // Handle CSV export
  const handleExport = async (reportType = 'sales') => {
    setIsExporting(true);
    try {
      const blob = await dashboardService.exportReport({
        ...getParams(),
        report: reportType,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `JI-Perfume-${reportType}-${dateRange.range}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to export CSV report:', err);
      alert('Failed to download CSV export. Ensure your session has dashboard:export permission.');
    } finally {
      setIsExporting(false);
    }
  };

  const canExport = hasPermission(currentUser, 'dashboard:export');
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const sumData = summary.data || {};

  return (
    <div className="space-y-6 print:space-y-4">
      {/* ============================================================ */}
      {/* 1. HEADER ROW */}
      {/* ============================================================ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-sm print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {currentUser?.role === 'SUPER_ADMIN' ? 'Owner HQ' : 'Boutique Manager'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, <strong className="text-slate-800">{currentUser?.name}</strong>. Here is the operational overview for J I PERFUME.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Store Switcher (SUPER_ADMIN only) */}
          <StoreSwitcher
            stores={stores}
            selectedStoreId={selectedStoreId}
            onChange={handleStoreChange}
            currentUser={currentUser}
          />

          {/* Date Range Picker */}
          <DateRangePicker
            range={dateRange.range}
            from={dateRange.from}
            to={dateRange.to}
            onChange={handleRangeChange}
          />

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title="Toggle 60s auto refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin text-emerald-600' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{autoRefresh ? 'Live (60s)' : 'Auto'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={refreshAll}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 rounded-xl transition cursor-pointer shadow-sm"
            title="Refresh dashboard data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 rounded-xl transition cursor-pointer shadow-sm hidden md:inline-flex"
            title="Print Dashboard Report"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Export Report (Requires dashboard:export) */}
          {canExport && (
            <div className="relative inline-block text-left group">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => handleExport('sales')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm shadow-amber-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting…' : 'Export CSV'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. QUICK ACTION SHORTCUTS */}
      {/* ============================================================ */}
      <div className="print:hidden">
        <DashboardQuickActions
          currentUser={currentUser}
          onNavigateTab={onNavigateTab}
        />
      </div>

      {/* ============================================================ */}
      {/* 3. CORE KPI CARDS (8-METRICS RESPONSIVE GRID) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={sumData.totalSales}
          change={sumData.salesChange}
          icon={DollarSign}
          isLoading={summary.loading}
          subtitle={`Across ${sumData.invoiceCount || 0} bills`}
        />
        <StatCard
          title="Invoices Issued"
          value={sumData.invoiceCount}
          isCurrency={false}
          change={sumData.invoicesChange}
          icon={Receipt}
          isLoading={summary.loading}
          subtitle="Customer receipts"
        />
        <StatCard
          title="Average Ticket (AOV)"
          value={sumData.avgBillValue}
          change={sumData.avgBillChange}
          icon={TrendingUp}
          isLoading={summary.loading}
          subtitle="Per billing checkout"
        />
        <StatCard
          title="GST Tax Collected"
          value={sumData.totalGst}
          change={sumData.gstChange}
          icon={Percent}
          isLoading={summary.loading}
          subtitle="18% (9% CGST + 9% SGST)"
        />
        <StatCard
          title="Tender Collected"
          value={sumData.totalCollected}
          change={sumData.collectedChange}
          icon={CheckCircle}
          isLoading={summary.loading}
          subtitle="Realized cash & UPI"
        />
        <StatCard
          title="Outstanding Dues"
          value={sumData.totalDues}
          change={sumData.duesChange}
          icon={Clock}
          invertTrend={true}
          isLoading={summary.loading}
          subtitle="Pending credit recovery"
        />
        <StatCard
          title="Discounts Conceded"
          value={sumData.totalDiscount}
          change={sumData.discountChange}
          icon={Sparkles}
          invertTrend={true}
          isLoading={summary.loading}
          subtitle="Promotional concessions"
        />
        <StatCard
          title="Low Stock Alerts"
          value={sumData.lowStockCount}
          isCurrency={false}
          icon={AlertTriangle}
          invertTrend={true}
          isLoading={summary.loading}
          badgeText={sumData.lowStockCount > 0 ? `${sumData.lowStockCount} items critical` : 'Healthy stock'}
          subtitle="At or below threshold"
        />
      </div>

      {/* ============================================================ */}
      {/* 4. INVENTORY VALUATION BANNER */}
      {/* ============================================================ */}
      {inventoryValue.data && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block mb-0.5">
                Boutique Inventory Valuation
              </span>
              <h2 className="text-lg sm:text-xl font-bold">
                {formatIndianCurrency(inventoryValue.data.totalRetailValue)} <span className="text-xs text-slate-400 font-normal">at Retail Price</span>
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-8 border-t md:border-t-0 md:border-l border-slate-700/60 pt-3 md:pt-0 md:pl-8 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Purchase Cost Basis</span>
              <span className="font-bold text-slate-200 text-sm">
                {formatIndianCurrency(inventoryValue.data.totalCostValue)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Total Luxury Bottles</span>
              <span className="font-bold text-amber-300 text-sm">
                {inventoryValue.data.totalBottles.toLocaleString('en-IN')} units
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Potential Margin</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                {inventoryValue.data.potentialMargin}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. SALES TREND (FULL WIDTH) */}
      {/* ============================================================ */}
      <SalesTrendChart
        data={salesTrend.data}
        isLoading={salesTrend.loading}
        error={salesTrend.error}
        onRetry={loadSalesTrend}
      />

      {/* ============================================================ */}
      {/* 6. PAYMENT METHODS DONUT & CATEGORY BREAKDOWN SIDE-BY-SIDE */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentDonut
          data={paymentMethods.data}
          isLoading={paymentMethods.loading}
        />
        <CategorySalesChart
          data={categorySales.data}
          isLoading={categorySales.loading}
        />
      </div>

      {/* ============================================================ */}
      {/* 7. BESTSELLING FRAGRANCES & (IF SUPER_ADMIN) STORE PERFORMANCE */}
      {/* ============================================================ */}
      <div className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
        <TopProductsList
          data={topProducts.data}
          isLoading={topProducts.loading}
        />
        {isSuperAdmin && (
          <StorePerformanceChart
            data={storePerformance.data}
            isLoading={storePerformance.loading}
          />
        )}
      </div>

      {/* ============================================================ */}
      {/* 8. STAFF PERFORMANCE & RECENT ACTIVITY AUDIT STREAM */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaffPerformanceTable
          data={staffPerformance.data}
          isLoading={staffPerformance.loading}
        />
        <RecentActivityFeed
          data={recentActivity.data}
          isLoading={recentActivity.loading}
        />
      </div>

      {/* ============================================================ */}
      {/* 9. CRITICAL ALERTS: LOW STOCK & PENDING DUES */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowStockTable
          data={lowStock.data}
          isLoading={lowStock.loading}
          currentUser={currentUser}
          onQuickStockIn={(item) => {
            if (onOpenQuickStockInModal) {
              onOpenQuickStockInModal(item);
            } else if (onNavigateTab) {
              onNavigateTab('products');
            }
          }}
        />
        <DuesTable
          data={pendingDues.data}
          isLoading={pendingDues.loading}
          currentUser={currentUser}
          onCollectDue={(inv) => {
            if (onOpenDuePaymentModal) {
              onOpenDuePaymentModal(inv);
            } else if (onNavigateTab) {
              onNavigateTab('invoices');
            }
          }}
        />
      </div>

      {/* ============================================================ */}
      {/* 10. RECENT COUNTER INVOICES TABLE */}
      {/* ============================================================ */}
      <RecentInvoicesTable
        data={recentInvoices.data}
        isLoading={recentInvoices.loading}
        onViewInvoice={(inv) => {
          if (onOpenViewInvoiceModal) {
            onOpenViewInvoiceModal(inv);
          }
        }}
      />
    </div>
  );
}
