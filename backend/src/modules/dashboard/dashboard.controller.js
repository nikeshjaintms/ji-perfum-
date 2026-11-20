import { prisma } from '../../config/prisma.js';

/**
 * Convert Date range strings or presets into start and end Date objects in IST (Asia/Kolkata, UTC+5:30)
 */
export function resolveDateRange(range = '30d', from = null, to = null) {
  const now = new Date();
  // IST offset: +5.5 hours = +330 minutes
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(now.getTime() + istOffsetMs);

  let startDate;
  let endDate = new Date(now.getTime());

  if (from && to) {
    startDate = new Date(`${from}T00:00:00.000Z`);
    // Adjust to end of day in UTC equivalent
    endDate = new Date(`${to}T23:59:59.999Z`);
  } else {
    switch (range) {
      case 'today': {
        const y = nowIst.getUTCFullYear();
        const m = nowIst.getUTCMonth();
        const d = nowIst.getUTCDate();
        // Today 00:00:00 IST in UTC
        startDate = new Date(Date.UTC(y, m, d) - istOffsetMs);
        break;
      }
      case '7d': {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      }
      case '30d': {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      }
      case 'thisMonth': {
        const y = nowIst.getUTCFullYear();
        const m = nowIst.getUTCMonth();
        startDate = new Date(Date.UTC(y, m, 1) - istOffsetMs);
        break;
      }
      case 'lastMonth': {
        const y = nowIst.getUTCFullYear();
        const m = nowIst.getUTCMonth() - 1;
        startDate = new Date(Date.UTC(y, m, 1) - istOffsetMs);
        const lastDay = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - istOffsetMs);
        endDate = lastDay;
        break;
      }
      default: {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      }
    }
  }

  // Calculate previous equal period for delta calculations
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - durationMs);
  const prevEndDate = new Date(startDate.getTime());

  return { startDate, endDate, prevStartDate, prevEndDate };
}

/**
 * Resolve effective store filter with backend security scoping:
 * - SUPER_ADMIN can view all stores or filter by specific storeId.
 * - Non-SUPER_ADMIN (e.g. STORE_MANAGER) is strictly forced to their assignedStoreId.
 */
export function resolveStoreScoping(req) {
  const { storeId } = req.query;
  const user = req.user;

  if (user.role === 'SUPER_ADMIN') {
    if (storeId && storeId !== 'ALL') {
      return storeId;
    }
    return null; // All stores
  }

  // Strictly enforce user's assigned store
  return user.assignedStoreId || null;
}

/**
 * 1. GET /summary
 * Total sales, invoice count, average bill, total GST, total discounts,
 * collected amount, outstanding dues, and new customers.
 * Includes % change vs previous equal period.
 */
export const getSummary = async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { startDate, endDate, prevStartDate, prevEndDate } = resolveDateRange(range, from, to);
    const storeId = resolveStoreScoping(req);

    // Current period filter (excluding CANCELLED)
    const baseWhere = {
      paymentStatus: { not: 'CANCELLED' },
      createdAt: { gte: startDate, lte: endDate },
      ...(storeId ? { storeId } : {}),
    };

    // Previous period filter
    const prevWhere = {
      paymentStatus: { not: 'CANCELLED' },
      createdAt: { gte: prevStartDate, lte: prevEndDate },
      ...(storeId ? { storeId } : {}),
    };

    const [currentInvoices, prevInvoices, currentCustomers, prevCustomers, lowStockCount] = await Promise.all([
      prisma.invoice.findMany({
        where: baseWhere,
        select: {
          grandTotal: true,
          subtotal: true,
          taxAmount: true,
          cgstAmount: true,
          sgstAmount: true,
          discountAmount: true,
          paidAmount: true,
          dueAmount: true,
        },
      }),
      prisma.invoice.findMany({
        where: prevWhere,
        select: {
          grandTotal: true,
          taxAmount: true,
          discountAmount: true,
          paidAmount: true,
          dueAmount: true,
        },
      }),
      prisma.customer.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      prisma.customer.count({
        where: { createdAt: { gte: prevStartDate, lte: prevEndDate } },
      }),
      prisma.stockBalance.count({
        where: {
          quantity: { lte: 10 },
          ...(storeId ? { storeId } : {}),
        },
      }),
    ]);

    // Aggregate Current
    let totalSales = 0;
    let totalGst = 0;
    let totalDiscount = 0;
    let totalCollected = 0;
    let totalDues = 0;

    for (const inv of currentInvoices) {
      totalSales += Number(inv.grandTotal || 0);
      totalGst += Number(inv.taxAmount || 0);
      totalDiscount += Number(inv.discountAmount || 0);
      totalCollected += Number(inv.paidAmount || 0);
      totalDues += Number(inv.dueAmount || 0);
    }

    const invoiceCount = currentInvoices.length;
    const avgBillValue = invoiceCount > 0 ? Number((totalSales / invoiceCount).toFixed(2)) : 0;

    // Aggregate Previous
    let prevTotalSales = 0;
    let prevTotalGst = 0;
    let prevTotalDiscount = 0;
    let prevTotalCollected = 0;
    let prevTotalDues = 0;

    for (const inv of prevInvoices) {
      prevTotalSales += Number(inv.grandTotal || 0);
      prevTotalGst += Number(inv.taxAmount || 0);
      prevTotalDiscount += Number(inv.discountAmount || 0);
      prevTotalCollected += Number(inv.paidAmount || 0);
      prevTotalDues += Number(inv.dueAmount || 0);
    }

    const prevInvoiceCount = prevInvoices.length;
    const prevAvgBillValue = prevInvoiceCount > 0 ? Number((prevTotalSales / prevInvoiceCount).toFixed(2)) : 0;

    // Helper for percentage delta
    const calcChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    return res.json({
      success: true,
      data: {
        totalSales: Number(totalSales.toFixed(2)),
        salesChange: calcChange(totalSales, prevTotalSales),

        invoiceCount,
        invoicesChange: calcChange(invoiceCount, prevInvoiceCount),

        avgBillValue,
        avgBillChange: calcChange(avgBillValue, prevAvgBillValue),

        totalGst: Number(totalGst.toFixed(2)),
        gstChange: calcChange(totalGst, prevTotalGst),

        totalDiscount: Number(totalDiscount.toFixed(2)),
        discountChange: calcChange(totalDiscount, prevTotalDiscount),

        totalCollected: Number(totalCollected.toFixed(2)),
        collectedChange: calcChange(totalCollected, prevTotalCollected),

        totalDues: Number(totalDues.toFixed(2)),
        duesChange: calcChange(totalDues, prevTotalDues),

        newCustomers: currentCustomers,
        customersChange: calcChange(currentCustomers, prevCustomers),

        lowStockCount,
      },
      metadata: {
        range,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        storeId,
      },
    });
  } catch (error) {
    console.error('getSummary error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to retrieve dashboard summary' });
  }
};

/**
 * 2. GET /sales-trend
 * Revenue and invoice count grouped by day (or month).
 */
export const getSalesTrend = async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { startDate, endDate } = resolveDateRange(range, from, to);
    const storeId = resolveStoreScoping(req);

    const invoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: { not: 'CANCELLED' },
        createdAt: { gte: startDate, lte: endDate },
        ...(storeId ? { storeId } : {}),
      },
      select: {
        grandTotal: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by Date in IST
    const map = new Map();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;

    for (const inv of invoices) {
      const istTime = new Date(inv.createdAt.getTime() + istOffsetMs);
      const dateKey = istTime.toISOString().slice(0, 10); // YYYY-MM-DD

      const existing = map.get(dateKey) || { date: dateKey, revenue: 0, bills: 0 };
      existing.revenue += Number(inv.grandTotal || 0);
      existing.bills += 1;
      map.set(dateKey, existing);
    }

    const data = Array.from(map.values()).map((row) => ({
      ...row,
      revenue: Number(row.revenue.toFixed(2)),
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getSalesTrend error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve sales trend' });
  }
};

/**
 * 3. GET /payment-methods
 * Split of Cash / UPI / Card / Due with amounts and counts.
 */
export const getPaymentMethods = async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { startDate, endDate } = resolveDateRange(range, from, to);
    const storeId = resolveStoreScoping(req);

    const invoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: { not: 'CANCELLED' },
        createdAt: { gte: startDate, lte: endDate },
        ...(storeId ? { storeId } : {}),
      },
      include: {
        payments: true,
      },
    });

    const breakdown = {
      CASH: { method: 'CASH', label: 'Cash Tender', amount: 0, count: 0, color: '#10b981' },
      UPI_QR: { method: 'UPI_QR', label: 'UPI QR Code', amount: 0, count: 0, color: '#3b82f6' },
      CARD: { method: 'CARD', label: 'Debit / Credit Card', amount: 0, count: 0, color: '#f59e0b' },
      CREDIT: { method: 'CREDIT', label: 'Customer Due (Credit)', amount: 0, count: 0, color: '#ef4444' },
    };

    for (const inv of invoices) {
      if (inv.payments && inv.payments.length > 0) {
        for (const p of inv.payments) {
          const m = p.method === 'UPI' ? 'UPI_QR' : p.method;
          if (breakdown[m]) {
            breakdown[m].amount += Number(p.amount || 0);
            breakdown[m].count += 1;
          }
        }
      } else {
        const m = inv.paymentMethod;
        if (breakdown[m]) {
          breakdown[m].amount += Number(inv.grandTotal || 0);
          breakdown[m].count += 1;
        }
      }

      // If invoice still has an outstanding due, track in CREDIT
      if (Number(inv.dueAmount) > 0 && inv.paymentMethod !== 'CREDIT') {
        breakdown.CREDIT.amount += Number(inv.dueAmount);
      }
    }

    const data = Object.values(breakdown).map((b) => ({
      ...b,
      amount: Number(b.amount.toFixed(2)),
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getPaymentMethods error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve payment method split' });
  }
};

/**
 * 4. GET /top-products
 * Top 10 products by quantity and revenue, with category.
 */
export const getTopProducts = async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { startDate, endDate } = resolveDateRange(range, from, to);
    const storeId = resolveStoreScoping(req);

    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          paymentStatus: { not: 'CANCELLED' },
          createdAt: { gte: startDate, lte: endDate },
          ...(storeId ? { storeId } : {}),
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const productMap = new Map();

    for (const item of items) {
      const pid = item.productId;
      const existing = productMap.get(pid) || {
        id: pid,
        name: item.productName || item.product?.name || 'Perfume',
        sku: item.sku || item.product?.sku,
        volumeMl: item.volumeMl || item.product?.volumeMl,
        category: item.product?.category?.name || 'Luxury Fragrance',
        quantity: 0,
        revenue: 0,
      };

      existing.quantity += Number(item.quantity || 0);
      existing.revenue += Number(item.totalAmount || 0);
      productMap.set(pid, existing);
    }

    const allProducts = Array.from(productMap.values()).map((p) => ({
      ...p,
      revenue: Number(p.revenue.toFixed(2)),
    }));

    // Top by quantity
    const byQuantity = [...allProducts].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    // Top by revenue
    const byRevenue = [...allProducts].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return res.json({
      success: true,
      data: {
        byQuantity,
        byRevenue,
      },
    });
  } catch (error) {
    console.error('getTopProducts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve top products' });
  }
};

/**
 * 5. GET /category-sales
 * Revenue share per scent family.
 */
export const getCategorySales = async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { startDate, endDate } = resolveDateRange(range, from, to);
    const storeId = resolveStoreScoping(req);

    const items = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          paymentStatus: { not: 'CANCELLED' },
          createdAt: { gte: startDate, lte: endDate },
          ...(storeId ? { storeId } : {}),
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const categoryMap = new Map();
    let grandRevenue = 0;

    for (const item of items) {
      const cat = item.product?.category;
      const catName = cat?.name || 'Uncategorized';
      const catId = cat?.id || 'other';
      const amount = Number(item.totalAmount || 0);
      grandRevenue += amount;

      const existing = categoryMap.get(catId) || {
        categoryId: catId,
        categoryName: catName,
        revenue: 0,
        bottlesSold: 0,
      };

      existing.revenue += amount;
      existing.bottlesSold += Number(item.quantity || 0);
      categoryMap.set(catId, existing);
    }

    const data = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      revenue: Number(c.revenue.toFixed(2)),
      sharePercentage: grandRevenue > 0 ? Number(((c.revenue / grandRevenue) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getCategorySales error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve category sales' });
  }
};

/**
 * 6. GET /store-performance
 * SUPER_ADMIN only: Revenue, invoices, and average bill per store.
 */
export const getStorePerformance = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Store performance comparison is restricted to Super Admin.',
      });
    }

    const { range = '30d', from, to } = req.query;
    const { startDate, endDate } = resolveDateRange(range, from, to);

    const stores = await prisma.store.findMany({
      where: { isActive: true },
      include: { city: true },
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: { not: 'CANCELLED' },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        storeId: true,
        grandTotal: true,
      },
    });

    const storeMap = new Map();
    for (const s of stores) {
      storeMap.set(s.id, {
        storeId: s.id,
        storeName: s.name,
        cityName: s.city?.name || 'Mandvi',
        revenue: 0,
        invoicesCount: 0,
        averageBill: 0,
      });
    }

    for (const inv of invoices) {
      if (inv.storeId && storeMap.has(inv.storeId)) {
        const target = storeMap.get(inv.storeId);
        target.revenue += Number(inv.grandTotal || 0);
        target.invoicesCount += 1;
      }
    }

    const data = Array.from(storeMap.values()).map((s) => ({
      ...s,
      revenue: Number(s.revenue.toFixed(2)),
      averageBill: s.invoicesCount > 0 ? Number((s.revenue / s.invoicesCount).toFixed(2)) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getStorePerformance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve store performance' });
  }
};

/**
 * 7. GET /staff-performance
 * Sales per cashier (bills, revenue, average bill).
 */
export const getStaffPerformance = async (req, res) => {
  try {
    const { range = '30d', from, to } = req.query;
    const { startDate, endDate } = resolveDateRange(range, from, to);
    const storeId = resolveStoreScoping(req);

    const invoices = await prisma.invoice.findMany({
      where: {
        paymentStatus: { not: 'CANCELLED' },
        createdAt: { gte: startDate, lte: endDate },
        ...(storeId ? { storeId } : {}),
      },
      include: {
        cashier: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    const staffMap = new Map();

    for (const inv of invoices) {
      const cid = inv.cashierId;
      const existing = staffMap.get(cid) || {
        cashierId: cid,
        name: inv.cashier?.name || 'Staff Member',
        email: inv.cashier?.email || 'N/A',
        role: inv.cashier?.role || 'CASHIER',
        billsCount: 0,
        revenue: 0,
      };

      existing.billsCount += 1;
      existing.revenue += Number(inv.grandTotal || 0);
      staffMap.set(cid, existing);
    }

    const data = Array.from(staffMap.values()).map((s) => ({
      ...s,
      revenue: Number(s.revenue.toFixed(2)),
      averageBill: s.billsCount > 0 ? Number((s.revenue / s.billsCount).toFixed(2)) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getStaffPerformance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve staff performance' });
  }
};

/**
 * 8. GET /low-stock
 * Products at or below reorderLevel per store, plus out-of-stock items.
 */
export const getLowStock = async (req, res) => {
  try {
    const storeId = resolveStoreScoping(req);

    const balances = await prisma.stockBalance.findMany({
      where: {
        ...(storeId ? { storeId } : {}),
        product: { isActive: true },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, volumeMl: true, reorderLevel: true, sellingPrice: true },
        },
        store: {
          select: { id: true, name: true, city: { select: { name: true } } },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    const lowStockItems = balances
      .filter((b) => b.quantity <= (b.reorderLevel || b.product?.reorderLevel || 10))
      .map((b) => ({
        stockBalanceId: b.id,
        productId: b.productId,
        productName: b.product?.name,
        sku: b.product?.sku,
        volumeMl: b.product?.volumeMl,
        sellingPrice: Number(b.product?.sellingPrice || 0),
        quantity: b.quantity,
        reorderLevel: b.reorderLevel || b.product?.reorderLevel || 10,
        isOutOfStock: b.quantity <= 0,
        storeId: b.storeId,
        storeName: b.store?.name,
        cityName: b.store?.city?.name,
        lowStockAlertSent: b.lowStockAlertSent || false,
        lastNotifiedAt: b.lastNotifiedAt || null,
      }));

    return res.json({ success: true, data: lowStockItems });
  } catch (error) {
    console.error('getLowStock error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve low stock alerts' });
  }
};

/**
 * 9. GET /inventory-value
 * Stock value at purchase cost and selling price, per store.
 */
export const getInventoryValue = async (req, res) => {
  try {
    const storeId = resolveStoreScoping(req);

    const balances = await prisma.stockBalance.findMany({
      where: {
        ...(storeId ? { storeId } : {}),
        product: { isActive: true },
      },
      include: {
        product: {
          select: { purchaseCost: true, sellingPrice: true },
        },
        store: {
          select: { id: true, name: true, city: { select: { name: true } } },
        },
      },
    });

    let totalCostValue = 0;
    let totalRetailValue = 0;
    let totalBottles = 0;

    const storeBreakdown = new Map();

    for (const b of balances) {
      const qty = Math.max(0, b.quantity);
      const cost = Number(b.product?.purchaseCost || 0);
      const retail = Number(b.product?.sellingPrice || 0);

      const lineCost = qty * cost;
      const lineRetail = qty * retail;

      totalCostValue += lineCost;
      totalRetailValue += lineRetail;
      totalBottles += qty;

      const sid = b.storeId;
      const existing = storeBreakdown.get(sid) || {
        storeId: sid,
        storeName: b.store?.name || 'Boutique',
        cityName: b.store?.city?.name || 'Mandvi',
        costValue: 0,
        retailValue: 0,
        bottleCount: 0,
      };

      existing.costValue += lineCost;
      existing.retailValue += lineRetail;
      existing.bottleCount += qty;
      storeBreakdown.set(sid, existing);
    }

    const stores = Array.from(storeBreakdown.values()).map((s) => ({
      ...s,
      costValue: Number(s.costValue.toFixed(2)),
      retailValue: Number(s.retailValue.toFixed(2)),
    }));

    return res.json({
      success: true,
      data: {
        totalCostValue: Number(totalCostValue.toFixed(2)),
        totalRetailValue: Number(totalRetailValue.toFixed(2)),
        totalBottles,
        potentialMargin: totalRetailValue > 0 ? Number((((totalRetailValue - totalCostValue) / totalRetailValue) * 100).toFixed(1)) : 0,
        storeBreakdown: stores,
      },
    });
  } catch (error) {
    console.error('getInventoryValue error:', error);
    return res.status(500).json({ success: false, message: 'Failed to calculate inventory valuation' });
  }
};

/**
 * 10. GET /recent-invoices
 * Latest 10 invoices with number, customer, store, total, and status.
 */
export const getRecentInvoices = async (req, res) => {
  try {
    const storeId = resolveStoreScoping(req);

    const invoices = await prisma.invoice.findMany({
      where: {
        ...(storeId ? { storeId } : {}),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        store: { select: { name: true, city: { select: { name: true } } } },
        cashier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const data = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer?.name || 'Valued Guest',
      customerPhone: inv.customer?.phone || 'N/A',
      storeName: inv.store?.name || 'Boutique',
      cityName: inv.store?.city?.name || 'Mandvi',
      cashierName: inv.cashier?.name || 'Staff',
      grandTotal: Number(inv.grandTotal),
      paidAmount: Number(inv.paidAmount),
      dueAmount: Number(inv.dueAmount),
      paymentStatus: inv.paymentStatus,
      paymentMethod: inv.paymentMethod,
      createdAt: inv.createdAt,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getRecentInvoices error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve recent invoices' });
  }
};

/**
 * 11. GET /pending-dues
 * Invoices with due balances, sorted by amount and age, with customer phone.
 */
export const getPendingDues = async (req, res) => {
  try {
    const storeId = resolveStoreScoping(req);

    const invoices = await prisma.invoice.findMany({
      where: {
        dueAmount: { gt: 0.01 },
        paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
        ...(storeId ? { storeId } : {}),
      },
      include: {
        customer: true,
        store: { select: { name: true, city: { select: { name: true } } } },
      },
      orderBy: [
        { dueAmount: 'desc' },
        { createdAt: 'asc' }, // Oldest first
      ],
      take: 20,
    });

    const now = new Date();

    const data = invoices.map((inv) => {
      const ageDays = Math.floor((now.getTime() - new Date(inv.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name || 'Valued Guest',
        customerPhone: inv.customer?.phone || 'N/A',
        storeName: inv.store?.name,
        cityName: inv.store?.city?.name,
        grandTotal: Number(inv.grandTotal),
        paidAmount: Number(inv.paidAmount),
        dueAmount: Number(inv.dueAmount),
        ageDays,
        createdAt: inv.createdAt,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('getPendingDues error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve pending dues' });
  }
};

/**
 * 12. GET /recent-activity
 * Latest stock movements and cancelled invoices.
 */
export const getRecentActivity = async (req, res) => {
  try {
    const storeId = resolveStoreScoping(req);

    const [movements, cancellations] = await Promise.all([
      prisma.stockMovement.findMany({
        where: {
          ...(storeId ? { storeId } : {}),
        },
        include: {
          product: { select: { name: true, sku: true } },
          store: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.invoice.findMany({
        where: {
          paymentStatus: 'CANCELLED',
          ...(storeId ? { storeId } : {}),
        },
        include: {
          store: { select: { name: true } },
          cashier: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const formattedMovements = movements.map((m) => ({
      id: m.id,
      activityType: 'STOCK_MOVEMENT',
      movementType: m.type, // SALE, PURCHASE_RECEIPT, ADJUSTMENT, RETURN
      productName: m.product?.name,
      sku: m.product?.sku,
      quantityChange: m.quantityChange,
      storeName: m.store?.name,
      userName: m.createdBy?.name || 'Staff',
      notes: m.notes,
      timestamp: m.createdAt,
    }));

    const formattedCancellations = cancellations.map((c) => ({
      id: c.id,
      activityType: 'INVOICE_CANCELLED',
      movementType: 'CANCEL',
      invoiceNumber: c.invoiceNumber,
      grandTotal: Number(c.grandTotal),
      storeName: c.store?.name,
      userName: c.cashier?.name || 'Staff',
      notes: c.notes || 'Invoice cancelled',
      timestamp: c.updatedAt,
    }));

    const unifiedActivity = [...formattedMovements, ...formattedCancellations]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    return res.json({ success: true, data: unifiedActivity });
  } catch (error) {
    console.error('getRecentActivity error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve activity stream' });
  }
};

/**
 * 13. GET /export
 * CSV export of selected report (sales | dues | low-stock). Requires dashboard:export.
 */
export const exportReport = async (req, res) => {
  try {
    const { report = 'sales', range = '30d', from, to } = req.query;
    const { startDate, endDate } = resolveDateRange(range, from, to);
    const storeId = resolveStoreScoping(req);

    if (report === 'sales') {
      const invoices = await prisma.invoice.findMany({
        where: {
          paymentStatus: { not: 'CANCELLED' },
          createdAt: { gte: startDate, lte: endDate },
          ...(storeId ? { storeId } : {}),
        },
        include: {
          customer: true,
          store: true,
          cashier: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const rows = [
        ['Invoice Number', 'Date', 'Customer Name', 'Phone', 'Store', 'Subtotal', 'Tax (18%)', 'Discount', 'Grand Total', 'Paid', 'Due', 'Payment Method', 'Status'].join(','),
      ];

      for (const inv of invoices) {
        rows.push([
          `"${inv.invoiceNumber}"`,
          `"${new Date(inv.createdAt).toLocaleDateString('en-IN')}"`,
          `"${(inv.customer?.name || 'Guest').replace(/"/g, '""')}"`,
          `"${inv.customer?.phone || ''}"`,
          `"${(inv.store?.name || '').replace(/"/g, '""')}"`,
          Number(inv.subtotal).toFixed(2),
          Number(inv.taxAmount).toFixed(2),
          Number(inv.discountAmount).toFixed(2),
          Number(inv.grandTotal).toFixed(2),
          Number(inv.paidAmount).toFixed(2),
          Number(inv.dueAmount).toFixed(2),
          `"${inv.paymentMethod}"`,
          `"${inv.paymentStatus}"`,
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="JI-Perfume-Sales-Report-${range}.csv"`);
      return res.send(rows.join('\n'));
    }

    if (report === 'dues') {
      const dues = await prisma.invoice.findMany({
        where: {
          dueAmount: { gt: 0.01 },
          paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
          ...(storeId ? { storeId } : {}),
        },
        include: { customer: true, store: true },
        orderBy: { dueAmount: 'desc' },
      });

      const rows = [
        ['Invoice Number', 'Date', 'Customer Name', 'Phone', 'Store', 'Grand Total', 'Paid Amount', 'Due Balance'].join(','),
      ];

      for (const inv of dues) {
        rows.push([
          `"${inv.invoiceNumber}"`,
          `"${new Date(inv.createdAt).toLocaleDateString('en-IN')}"`,
          `"${(inv.customer?.name || 'Guest').replace(/"/g, '""')}"`,
          `"${inv.customer?.phone || ''}"`,
          `"${(inv.store?.name || '').replace(/"/g, '""')}"`,
          Number(inv.grandTotal).toFixed(2),
          Number(inv.paidAmount).toFixed(2),
          Number(inv.dueAmount).toFixed(2),
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="JI-Perfume-Pending-Dues-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(rows.join('\n'));
    }

    if (report === 'low-stock') {
      const balances = await prisma.stockBalance.findMany({
        where: {
          ...(storeId ? { storeId } : {}),
          product: { isActive: true },
        },
        include: {
          product: true,
          store: true,
        },
      });

      const lowStock = balances.filter((b) => b.quantity <= (b.reorderLevel || b.product?.reorderLevel || 10));

      const rows = [
        ['SKU', 'Product Name', 'Volume (ml)', 'Store', 'Current Stock', 'Reorder Level', 'Retail Price'].join(','),
      ];

      for (const b of lowStock) {
        rows.push([
          `"${b.product?.sku}"`,
          `"${(b.product?.name || '').replace(/"/g, '""')}"`,
          b.product?.volumeMl || 100,
          `"${(b.store?.name || '').replace(/"/g, '""')}"`,
          b.quantity,
          b.reorderLevel,
          Number(b.product?.sellingPrice || 0).toFixed(2),
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="JI-Perfume-Low-Stock-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(rows.join('\n'));
    }

    return res.status(400).json({ success: false, message: 'Invalid report type requested. Choose sales, dues, or low-stock.' });
  } catch (error) {
    console.error('exportReport error:', error);
    return res.status(500).json({ success: false, message: 'Failed to export report' });
  }
};

/**
 * 14. Trigger Low Stock WhatsApp Cron Job On-Demand
 * POST /api/v1/dashboard/trigger-low-stock-cron
 */
export const triggerLowStockCron = async (req, res) => {
  try {
    const { dryRun = false } = req.body || {};
    const { runLowStockCheckJob } = await import('../../jobs/lowStockCron.js');
    const result = await runLowStockCheckJob({ dryRun: Boolean(dryRun) });

    return res.json({
      success: true,
      message: 'Low stock WhatsApp cron job executed successfully',
      data: result,
    });
  } catch (error) {
    console.error('triggerLowStockCron error:', error);
    return res.status(500).json({ success: false, message: 'Failed to run low stock cron job: ' + error.message });
  }
};
