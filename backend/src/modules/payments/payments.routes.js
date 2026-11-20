import { Router } from 'express';
import {
  getInvoicePaymentDetails,
  confirmPayment,
  createRazorpayOrder,      
  verifyRazorpayPayment,
} from './payments.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/:invoiceId/qr', authenticate, getInvoicePaymentDetails);
router.post('/:invoiceId/confirm', authenticate, confirmPayment);
router.post('/:invoiceId/razorpay/create-order', authenticate, createRazorpayOrder); // <-- Add route
router.post('/:invoiceId/razorpay/verify', authenticate, verifyRazorpayPayment);

export default router;
