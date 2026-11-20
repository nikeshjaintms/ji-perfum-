import QRCode from 'qrcode';
import { prisma } from '../../config/prisma.js';
import { sendWhatsAppInvoice } from '../../services/whatsapp.service.js';
import crypto from 'crypto';
import { razorpayInstance } from '../../config/razorpay.js';

export const getInvoicePaymentDetails = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, store: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const upiId = invoice.store?.upiId || process.env.STORE_UPI_ID || 'jjperfumes@icici';
    const storeName = invoice.store?.name || process.env.STORE_NAME || 'J I PERFUME';
    
    // Find pending payment amount (for split payments)
    const pendingPayment = invoice.payments.find((p) => p.status === 'PENDING') || invoice.payments[0];
    const amountToPay = pendingPayment ? Number(pendingPayment.amount) : Number(invoice.grandTotal);

    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amountToPay}&cu=INR&tn=${encodeURIComponent('J I Perfume Inv ' + invoice.invoiceNumber + (invoice.paymentMethod === 'SPLIT' ? ' Bal' : ''))}`;

    const qrDataUrl = await QRCode.toDataURL(upiString, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0A47E5',
        light: '#FFFFFF',
      },
    });

    return res.json({
      success: true,
      data: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        grandTotal: Number(invoice.grandTotal),
        amountToPay,
        paymentStatus: invoice.paymentStatus,
        paymentMethod: invoice.paymentMethod,
        payments: invoice.payments,
        upiString,
        qrDataUrl,
        storeUpiId: upiId,
      },
    });
  } catch (error) {
    console.error('getInvoicePaymentDetails error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate payment details' });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { transactionReference, method, notes } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.paymentStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Invoice is already marked as PAID' });
    }

    const finalMethod = invoice.paymentMethod === 'SPLIT' ? 'SPLIT' : (method || invoice.paymentMethod);
    const ref = transactionReference || `UTR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    await prisma.$transaction(async (tx) => {
      // Find pending UPI payment specifically if present
      const upiPending = invoice.payments.find((p) => p.status === 'PENDING' && p.method === 'UPI_QR');
      const targetPending = upiPending || invoice.payments.find((p) => p.status === 'PENDING' && p.method !== 'CREDIT');

      let newPaid = Number(invoice.paidAmount || 0);
      let newDue = Number(invoice.dueAmount || invoice.grandTotal);

      if (targetPending) {
        await tx.payment.update({
          where: { id: targetPending.id },
          data: {
            status: 'PAID',
            transactionReference: ref,
            paidAt: new Date(),
          },
        });
        const paidDelta = Number(targetPending.amount);
        newPaid = Number((newPaid + paidDelta).toFixed(2));
        newDue = Math.max(0, Number((newDue - paidDelta).toFixed(2)));
      } else if (invoice.payments.length > 0) {
        await tx.payment.update({
          where: { id: invoice.payments[0].id },
          data: {
            status: 'PAID',
            method: finalMethod,
            transactionReference: ref,
            paidAt: new Date(),
          },
        });
        newPaid = Number(invoice.grandTotal);
        newDue = 0;
      } else {
        await tx.payment.create({
          data: {
            invoiceId,
            amount: invoice.grandTotal,
            method: finalMethod,
            status: 'PAID',
            transactionReference: ref,
            paidAt: new Date(),
          },
        });
        newPaid = Number(invoice.grandTotal);
        newDue = 0;
      }

      // Check if there is still an outstanding due balance (e.g. Credit)
      const hasRemainingDue = newDue > 0.01;
      const finalStatus = hasRemainingDue ? 'PARTIALLY_PAID' : 'PAID';

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaid,
          dueAmount: newDue,
          paymentStatus: finalStatus,
          paymentMethod: finalMethod,
        },
      });
    });

    // Fetch updated invoice for WhatsApp receipt dispatch
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        store: { include: { city: true } },
        items: true,
        payments: true,
      },
    });

    // Send WhatsApp bill to the customer upon payment success
    let whatsappResult = null;
    if (updatedInvoice) {
      try {
        whatsappResult = await sendWhatsAppInvoice(updatedInvoice);
        if (!whatsappResult?.success) {
          console.error(`\x1b[31m[Payment Confirmed but WhatsApp Failed]\x1b[0m ${whatsappResult?.message}`);
        }
      } catch (wsErr) {
        console.error('\x1b[31m[WhatsApp invoice dispatch exception]:\x1b[0m', wsErr.message);
      }
    }

    return res.json({
      success: true,
      message: 'Payment confirmed successfully!',
      data: {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: updatedInvoice?.paymentStatus || 'PAID',
        transactionReference: ref,
        whatsapp: whatsappResult,
        invoice: updatedInvoice,
      },
    });
  } catch (error) {
    console.error('confirmPayment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to confirm payment' });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, store: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Determine pending amount to collect
    const amountToPay = Number(invoice.dueAmount || invoice.grandTotal);
    const amountInPaise = Math.round(amountToPay * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `inv_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}`.slice(0, 40),
      notes: {
        invoiceId: invoice.id,
        storeName: invoice.store?.name || 'J I PERFUME',
      },
    };

    const order = await razorpayInstance.orders.create(options);

    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer?.name || '',
        customerPhone: invoice.customer?.phone || '',
      },
    });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create Razorpay order' });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // 1. Verify HMAC SHA-256 signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    // 2. Fetch invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // 3. Update payment & invoice status inside transaction
    await prisma.$transaction(async (tx) => {
      const pendingPayment = invoice.payments.find((p) => p.status === 'PENDING');

      if (pendingPayment) {
        await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            status: 'PAID',
            transactionReference: razorpay_payment_id,
            paidAt: new Date(),
          },
        });
      } else {
        await tx.payment.create({
          data: {
            invoiceId,
            amount: invoice.grandTotal,
            method: 'CARD', // or UPI_QR
            status: 'PAID',
            transactionReference: razorpay_payment_id,
            paidAt: new Date(),
          },
        });
      }

      // Mark invoice as PAID
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: invoice.grandTotal,
          dueAmount: 0,
          paymentStatus: 'PAID',
        },
      });
    });

    // 4. Trigger WhatsApp receipt
    let whatsappResult = null;
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: true, store: true, items: true, payments: true },
    });

    if (updatedInvoice) {
      whatsappResult = await sendWhatsAppInvoice(updatedInvoice).catch((err) => {
        console.error('WhatsApp dispatch error:', err.message);
        return { success: false, message: err.message };
      });
    }

    return res.json({
      success: true,
      message: 'Razorpay payment verified and confirmed successfully!',
      data: {
        invoiceId,
        paymentReference: razorpay_payment_id,
        invoice: updatedInvoice,
        whatsapp: whatsappResult,
      },
    });
  } catch (error) {
    console.error('Razorpay verify payment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify Razorpay payment' });
  }
};