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

router.post('/', authenticate, authorize(['billing:create']), createInvoice);
router.get('/', authenticate, authorize(['invoices:view']), getInvoices);
router.get('/:id', authenticate, authorize(['invoices:view', 'dashboard:view']), getInvoiceById);
router.get('/:id/pdf', getInvoicePdf); // Allows viewing or downloading PDF
router.post('/:id/cancel', authenticate, authorize(['invoices:cancel']), cancelInvoice);
router.post('/:id/collect-due', authenticate, authorize(['billing:settle']), collectDuePayment);
router.post('/:id/send-whatsapp', authenticate, authorize(['invoices:whatsapp']), sendWhatsAppBill);

export default router;
