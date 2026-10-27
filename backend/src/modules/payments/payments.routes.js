import { Router } from 'express';
import {
  getInvoicePaymentDetails,
  confirmPayment,
} from './payments.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/:invoiceId/qr', authenticate, getInvoicePaymentDetails);
router.post('/:invoiceId/confirm', authenticate, confirmPayment);

export default router;
