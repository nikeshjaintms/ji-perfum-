import { Router } from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  cancelInvoice,
  collectDuePayment,
} from './billing.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createInvoice);
router.get('/', authenticate, getInvoices);
router.get('/:id', authenticate, getInvoiceById);
router.post('/:id/cancel', authenticate, authorize(['SUPER_ADMIN', 'STORE_MANAGER']), cancelInvoice);
router.post('/:id/collect-due', authenticate, collectDuePayment);

export default router;
