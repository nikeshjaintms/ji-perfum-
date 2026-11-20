import { Router } from 'express';
import {
  getSummary,
  getSalesTrend,
  getPaymentMethods,
  getTopProducts,
  getCategorySales,
  getStorePerformance,
  getStaffPerformance,
  getLowStock,
  getInventoryValue,
  getRecentInvoices,
  getPendingDues,
  getRecentActivity,
  exportReport,
  triggerLowStockCron,
} from './dashboard.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// All dashboard endpoints require authentication and dashboard:view capability
router.use(authenticate);

router.get('/summary', authorize(['dashboard:view']), getSummary);
router.get('/sales-trend', authorize(['dashboard:view']), getSalesTrend);
router.get('/payment-methods', authorize(['dashboard:view']), getPaymentMethods);
router.get('/top-products', authorize(['dashboard:view']), getTopProducts);
router.get('/category-sales', authorize(['dashboard:view']), getCategorySales);
router.get('/store-performance', authorize(['dashboard:view']), getStorePerformance);
router.get('/staff-performance', authorize(['dashboard:view']), getStaffPerformance);
router.get('/low-stock', authorize(['dashboard:view']), getLowStock);
router.get('/inventory-value', authorize(['dashboard:view']), getInventoryValue);
router.get('/recent-invoices', authorize(['dashboard:view']), getRecentInvoices);
router.get('/pending-dues', authorize(['dashboard:view']), getPendingDues);
router.get('/recent-activity', authorize(['dashboard:view']), getRecentActivity);

// Export endpoint specifically requires dashboard:export
router.get('/export', authorize(['dashboard:export']), exportReport);

// Trigger low stock WhatsApp cron job on-demand
router.post('/trigger-low-stock-cron', authorize(['dashboard:view']), triggerLowStockCron);

export default router;
