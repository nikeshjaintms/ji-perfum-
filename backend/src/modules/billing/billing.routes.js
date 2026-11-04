import { Router } from 'express';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  cancelInvoice,
  collectDuePayment,
  sendWhatsAppBill,
  getInvoicePdf,
} from './billing.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createInvoice);
router.get('/', authenticate, getInvoices);
router.get('/:id', authenticate, getInvoiceById);
router.get('/:id/pdf', getInvoicePdf); // Allows viewing or downloading PDF
router.post('/:id/cancel', authenticate, authorize(['SUPER_ADMIN', 'STORE_MANAGER']), cancelInvoice);
router.post('/:id/collect-due', authenticate, collectDuePayment);
router.post('/:id/send-whatsapp', authenticate, sendWhatsAppBill);

export default router;
