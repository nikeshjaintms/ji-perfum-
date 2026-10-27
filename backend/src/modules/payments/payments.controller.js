import QRCode from 'qrcode';
import { prisma } from '../../config/prisma.js';

export const getInvoicePaymentDetails = async (req, res) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const upiId = process.env.STORE_UPI_ID || 'jjperfumes@icici';
    const storeName = process.env.STORE_NAME || 'JJ PERFUME';
    
    // Find pending payment amount (for split payments)
    const pendingPayment = invoice.payments.find((p) => p.status === 'PENDING') || invoice.payments[0];
    const amountToPay = pendingPayment ? Number(pendingPayment.amount) : Number(invoice.grandTotal);

    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amountToPay}&cu=INR&tn=${encodeURIComponent('JJ Perfume Inv ' + invoice.invoiceNumber + (invoice.paymentMethod === 'SPLIT' ? ' Bal' : ''))}`;

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

    return res.json({
      success: true,
      message: 'Payment confirmed successfully!',
      data: {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        paymentStatus: 'PAID',
        transactionReference: ref,
      },
    });
  } catch (error) {
    console.error('confirmPayment error:', error);
    return res.status(500).json({ success: false, message: 'Failed to confirm payment' });
  }
};
