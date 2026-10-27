import QRCode from 'qrcode';
import { prisma } from '../../config/prisma.js';

export const createInvoice = async (req, res) => {
  try {
    const {
      customerId,
      customerData, // { name, phone, email, city, address }
      items, // [{ productId, quantity }]
      discountType = 'NONE',
      discountValue = 0,
      paymentMethod = 'UPI_QR',
      splitDetails, // { cashAmount, upiAmount, cardAmount }
      isDirectPaid = false,
      notes,
      storeId, // Multi-City Store ID
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Invoice must contain at least one item.' });
    }

    // 1. Resolve Store & City
    let resolvedStoreId = storeId || req.user.assignedStoreId;
    if (!resolvedStoreId) {
      const defaultStore = await prisma.store.findFirst({
        where: { isActive: true },
        include: { city: true },
      });
      resolvedStoreId = defaultStore?.id;
    }

    const store = await prisma.store.findUnique({
      where: { id: resolvedStoreId },
      include: { city: true },
    });

    if (!store) {
      return res.status(400).json({ success: false, message: 'Valid Store/City location is required.' });
    }

    // 2. Fetch products and validate stock for this specific Store
    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        stockBalances: {
          where: { storeId: store.id },
        },
      },
    });

    if (dbProducts.length !== productIds.length) {
      return res.status(400).json({ success: false, message: 'One or more selected products are invalid.' });
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Check store-specific stock
    for (const item of items) {
      const prod = productMap.get(item.productId);
      if (!prod.isActive) {
        return res.status(400).json({ success: false, message: `Product ${prod.name} is currently inactive.` });
      }

      const storeBal = prod.stockBalances?.[0]?.quantity ?? prod.stockQuantity;
      if (storeBal < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${prod.name}" in ${store.city.name} (${store.name}). Available: ${storeBal}, Requested: ${item.quantity}`,
        });
      }
    }

    // 3. Authoritative Price Calculations
    let subtotal = 0;
    const validatedItems = items.map((item) => {
      const prod = productMap.get(item.productId);
      const unitPrice = Number(prod.sellingPrice);
      const qty = Number(item.quantity);
      const totalAmount = Number((unitPrice * qty).toFixed(2));
      subtotal += totalAmount;

      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        volumeMl: prod.volumeMl,
        unitPrice,
        quantity: qty,
        totalAmount,
      };
    });

    subtotal = Number(subtotal.toFixed(2));

    // Calculate discount
    let discountAmount = 0;
    const numDiscountValue = Number(discountValue) || 0;

    if (discountType === 'FIXED') {
      discountAmount = Math.min(numDiscountValue, subtotal);
    } else if (discountType === 'PERCENTAGE') {
      const pct = Math.min(Math.max(numDiscountValue, 0), 100);
      discountAmount = Number(((subtotal * pct) / 100).toFixed(2));
    }

    const taxableAmount = Number((subtotal - discountAmount).toFixed(2));

    // GST: 18% standard for luxury perfumery (9% CGST + 9% SGST)
    const taxRate = 18.00;
    const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
    const cgstAmount = Number((taxAmount / 2).toFixed(2));
    const sgstAmount = Number((taxAmount - cgstAmount).toFixed(2));

    const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

    // 4. Generate Sequential Invoice Number (e.g. JJ-2026-0001)
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count();
    const invoiceNumber = `JJ-${year}-${String(count + 1).padStart(4, '0')}`;

    // 5. Resolve Customer
    let resolvedCustomerId = customerId || null;
    if (!resolvedCustomerId && customerData?.phone) {
      const existingCust = await prisma.customer.findUnique({
        where: { phone: customerData.phone.trim() },
      });
      if (existingCust) {
        resolvedCustomerId = existingCust.id;
      } else {
        const newCust = await prisma.customer.create({
          data: {
            name: customerData.name?.trim() || 'Walk-in Guest',
            phone: customerData.phone.trim(),
            email: customerData.email?.trim() || null,
            city: store.city.name,
            address: customerData.address?.trim() || null,
          },
        });
        resolvedCustomerId = newCust.id;
      }
    }

    // 5. Multi-Tender Split Payment, Credit / Partial Due, or Direct Settlement Handling
    let isPaid = false;
    let paymentStatus = 'PENDING';
    let splitSummary = null;

    let cashAmount = 0;
    let upiAmount = 0;
    let cardAmount = 0;
    let creditAmount = 0;

    let paidAmount = 0;
    let dueAmount = 0;

    if (paymentMethod === 'SPLIT') {
      cashAmount = Number(Number(splitDetails?.cashAmount || 0).toFixed(2));
      upiAmount = Number(Number(splitDetails?.upiAmount || 0).toFixed(2));
      cardAmount = Number(Number(splitDetails?.cardAmount || 0).toFixed(2));
      creditAmount = Number(Number(splitDetails?.creditAmount || 0).toFixed(2));

      const splitSum = Number((cashAmount + upiAmount + cardAmount + creditAmount).toFixed(2));
      if (Math.abs(splitSum - grandTotal) > 0.05) {
        return res.status(400).json({
          success: false,
          message: `Split payment total (₹${splitSum}) must match the grand total (₹${grandTotal}).`,
        });
      }

      // Customer name/phone validation if credit is involved
      if (creditAmount > 0 && !resolvedCustomerId && !customerData?.phone && !customerData?.name) {
        return res.status(400).json({
          success: false,
          message: 'Customer name or phone is required for Credit / Partial Due payment.',
        });
      }

      paidAmount = Number((cashAmount + cardAmount).toFixed(2));
      dueAmount = Number((creditAmount + upiAmount).toFixed(2));

      if (creditAmount > 0) {
        paymentStatus = 'PARTIALLY_PAID';
        isPaid = false;
      } else if (upiAmount > 0) {
        paymentStatus = 'PENDING';
        isPaid = false;
      } else {
        paymentStatus = 'PAID';
        isPaid = true;
      }

      const tenderParts = [];
      if (cashAmount > 0) tenderParts.push(`Cash ₹${cashAmount}`);
      if (cardAmount > 0) tenderParts.push(`Card ₹${cardAmount}`);
      if (upiAmount > 0) tenderParts.push(`UPI ₹${upiAmount}`);
      if (creditAmount > 0) tenderParts.push(`Credit ₹${creditAmount} (Due)`);
      splitSummary = `Split: ${tenderParts.join(' + ')}`;
    } else if (paymentMethod === 'CREDIT') {
      // 100% Credit / Customer Due
      creditAmount = grandTotal;
      paidAmount = 0;
      dueAmount = grandTotal;
      paymentStatus = 'PARTIALLY_PAID';
      isPaid = false;
      splitSummary = `Customer Credit: Full ₹${grandTotal} Due`;
    } else {
      isPaid = isDirectPaid && (paymentMethod === 'CASH' || paymentMethod === 'CARD');
      paymentStatus = isPaid ? 'PAID' : 'PENDING';
      paidAmount = isPaid ? grandTotal : 0;
      dueAmount = isPaid ? 0 : grandTotal;
    }

    // 6. Generate Dynamic UPI QR Code payload for this store
    // For SPLIT payments, generate QR code strictly for the remaining UPI amount!
    const effectiveUpiAmount = paymentMethod === 'SPLIT' ? upiAmount : (paymentMethod === 'CREDIT' ? 0 : grandTotal);
    const storeUpi = store.upiId || process.env.STORE_UPI_ID || 'jjperfumes@icici';
    const storeName = store.name || 'J I PERFUME';

    let upiString = null;
    let qrDataUrl = null;

    if ((paymentMethod === 'UPI_QR' || (paymentMethod === 'SPLIT' && upiAmount > 0)) && effectiveUpiAmount > 0) {
      upiString = `upi://pay?pa=${storeUpi}&pn=${encodeURIComponent(storeName)}&am=${effectiveUpiAmount}&cu=INR&tn=${encodeURIComponent('Bill ' + invoiceNumber + (paymentMethod === 'SPLIT' ? ' Bal' : ''))}`;
      try {
        qrDataUrl = await QRCode.toDataURL(upiString, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0A47E5',
            light: '#FFFFFF',
          },
        });
      } catch (qrErr) {
        console.warn('QR code generation warning:', qrErr);
      }
    }

    // 7. Execute atomic database transaction
    const finalNotes = [notes, splitSummary].filter(Boolean).join(' | ');

    const result = await prisma.$transaction(async (tx) => {
      // Create Invoice with store relation
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: resolvedCustomerId,
          cashierId: req.user.id,
          storeId: store.id,
          subtotal,
          discountType,
          discountValue: numDiscountValue,
          discountAmount,
          taxableAmount,
          taxRate,
          taxAmount,
          cgstAmount,
          sgstAmount,
          grandTotal,
          paidAmount,
          dueAmount,
          paymentStatus,
          paymentMethod,
          notes: finalNotes,
          items: {
            create: validatedItems.map((vi) => ({
              productId: vi.productId,
              productName: vi.productName,
              sku: vi.sku,
              volumeMl: vi.volumeMl,
              unitPrice: vi.unitPrice,
              quantity: vi.quantity,
              totalAmount: vi.totalAmount,
            })),
          },
        },
        include: {
          items: true,
          customer: true,
          store: { include: { city: true } },
          cashier: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      // Update location-wise StockBalance & aggregate Product stock
      for (const item of items) {
        // Decrement store-specific stock balance
        await tx.stockBalance.upsert({
          where: {
            productId_storeId: {
              productId: item.productId,
              storeId: store.id,
            },
          },
          update: { quantity: { decrement: item.quantity } },
          create: {
            productId: item.productId,
            storeId: store.id,
            quantity: 0,
          },
        });

        // Decrement aggregate product stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        });

        // Audit log
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            storeId: store.id,
            quantityChange: -item.quantity,
            type: 'SALE',
            referenceId: createdInvoice.id,
            notes: `POS Bill #${invoiceNumber} at ${store.name} (${store.city.name})`,
            createdById: req.user.id,
          },
        });
      }

      // Create Payment records (supporting multi-tender split)
      const paymentRecords = [];

      if (paymentMethod === 'SPLIT' || paymentMethod === 'CREDIT') {
        if (cashAmount > 0) {
          const cashPay = await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              amount: cashAmount,
              method: 'CASH',
              status: 'PAID',
              paidAt: new Date(),
              transactionReference: `CASH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            },
          });
          paymentRecords.push(cashPay);
        }

        if (cardAmount > 0) {
          const cardPay = await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              amount: cardAmount,
              method: 'CARD',
              status: 'PAID',
              paidAt: new Date(),
              transactionReference: `CARD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            },
          });
          paymentRecords.push(cardPay);
        }

        if (upiAmount > 0) {
          const upiPay = await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              amount: upiAmount,
              method: 'UPI_QR',
              status: 'PENDING',
              upiString,
              qrDataUrl,
            },
          });
          paymentRecords.push(upiPay);
        }

        if (creditAmount > 0) {
          const creditPay = await tx.payment.create({
            data: {
              invoiceId: createdInvoice.id,
              amount: creditAmount,
              method: 'CREDIT',
              status: 'PENDING',
              transactionReference: `CREDIT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
            },
          });
          paymentRecords.push(creditPay);
        }
      } else {
        const singlePay = await tx.payment.create({
          data: {
            invoiceId: createdInvoice.id,
            amount: grandTotal,
            method: paymentMethod,
            status: paymentStatus,
            upiString: paymentMethod === 'UPI_QR' ? upiString : null,
            qrDataUrl: paymentMethod === 'UPI_QR' ? qrDataUrl : null,
            paidAt: isPaid ? new Date() : null,
            transactionReference: isPaid ? `POS-${Date.now()}` : null,
          },
        });
        paymentRecords.push(singlePay);
      }

      return { invoice: createdInvoice, payments: paymentRecords };
    });

    const primaryPayment = result.payments.find((p) => p.status === 'PENDING') || result.payments[0];

    return res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        ...result.invoice,
        payment: primaryPayment,
        payments: result.payments,
        splitDetails: (paymentMethod === 'SPLIT' || paymentMethod === 'CREDIT') ? {
          cashAmount,
          upiAmount,
          cardAmount,
          creditAmount,
          paidAmount,
          dueAmount,
        } : null,
        qrCode: {
          upiString,
          qrDataUrl,
          amount: effectiveUpiAmount,
          storeUpiId: storeUpi,
        },
      },
    });
  } catch (error) {
    console.error('createInvoice error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create invoice' });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const { search, status, paymentMethod, storeId, cityId, limit = 50, page = 1 } = req.query;

    const where = {};

    if (status) {
      where.paymentStatus = status;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (storeId) {
      where.storeId = storeId;
    } else if (cityId) {
      where.store = { cityId };
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: true,
          store: { include: { city: true } },
          cashier: { select: { id: true, name: true, role: true } },
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.invoice.count({ where }),
    ]);

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: Number(page),
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error('getInvoices error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invoices' });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        store: { include: { city: true } },
        cashier: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, brand: true, concentration: true, volumeMl: true },
            },
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    return res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('getInvoiceById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invoice' });
  }
};

export const cancelInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.paymentStatus === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Invoice is already cancelled' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update invoice status
      await tx.invoice.update({
        where: { id },
        data: {
          paymentStatus: 'CANCELLED',
          notes: invoice.notes ? `${invoice.notes} | Cancelled: ${reason || 'Customer request'}` : `Cancelled: ${reason || 'Customer request'}`,
        },
      });

      // 2. Restore inventory to specific store balance & total aggregate
      for (const item of invoice.items) {
        if (invoice.storeId) {
          await tx.stockBalance.upsert({
            where: {
              productId_storeId: {
                productId: item.productId,
                storeId: invoice.storeId,
              },
            },
            update: { quantity: { increment: item.quantity } },
            create: {
              productId: item.productId,
              storeId: invoice.storeId,
              quantity: item.quantity,
            },
          });
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            storeId: invoice.storeId,
            quantityChange: item.quantity,
            type: 'RETURN',
            referenceId: invoice.id,
            notes: `Restock due to invoice cancellation #${invoice.invoiceNumber}`,
            createdById: req.user.id,
          },
        });
      }
    });

    return res.json({ success: true, message: 'Invoice cancelled and stock restored successfully.' });
  } catch (error) {
    console.error('cancelInvoice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel invoice' });
  }
};

export const collectDuePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method = 'CASH', transactionReference, notes } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true, customer: true },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const currentDue = Number(invoice.dueAmount);
    if (currentDue <= 0.01) {
      return res.status(400).json({ success: false, message: 'Invoice has no outstanding due balance.' });
    }

    if (numAmount > currentDue + 0.05) {
      return res.status(400).json({
        success: false,
        message: `Amount (₹${numAmount}) cannot exceed outstanding due balance (₹${currentDue}).`,
      });
    }

    const newPaidAmount = Number((Number(invoice.paidAmount) + numAmount).toFixed(2));
    const newDueAmount = Math.max(0, Number((currentDue - numAmount).toFixed(2)));
    const newPaymentStatus = newDueAmount <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

    const ref = transactionReference || `${method}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment record for this collected tender
      const paymentRecord = await tx.payment.create({
        data: {
          invoiceId: id,
          amount: numAmount,
          method: method === 'UPI' ? 'UPI_QR' : method,
          status: 'PAID',
          paidAt: new Date(),
          transactionReference: ref,
        },
      });

      // 2. Update Invoice financial balance
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          paymentStatus: newPaymentStatus,
          notes: [invoice.notes, `Collected ₹${numAmount} via ${method} (Ref: ${ref})`].filter(Boolean).join(' | '),
        },
        include: {
          customer: true,
          store: { include: { city: true } },
          payments: true,
          items: true,
        },
      });

      return { invoice: updatedInvoice, payment: paymentRecord };
    });

    return res.json({
      success: true,
      message: `Successfully collected ₹${numAmount}. Outstanding Due: ₹${result.invoice.dueAmount}`,
      data: result.invoice,
    });
  } catch (error) {
    console.error('collectDuePayment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to collect due payment' });
  }
};
