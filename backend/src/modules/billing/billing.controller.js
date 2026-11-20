import QRCode from 'qrcode';
import { prisma } from '../../config/prisma.js';
import { sendWhatsAppInvoice, sanitizeIndianPhone } from '../../services/whatsapp.service.js';
import { generateInvoicePdfBuffer, saveInvoicePdfLocally } from '../../services/pdf.service.js';
import {
  evaluateStockTrackingInTx,
  dispatchLowStockWhatsAppNotification,
} from '../../services/lowStock.service.js';

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

    // 0. Customer Name & Phone Validation for WhatsApp Billing
    const customerName = (customerData?.name || '').trim();
    const customerPhone = (customerData?.phone || '').trim();

    if (!customerName) {
      return res.status(400).json({ success: false, message: 'Customer name is required.' });
    }
    if (customerName.length < 2) {
      return res.status(400).json({ success: false, message: 'Customer name must be at least 2 characters.' });
    }
    if (!/^[a-zA-Z\s'.\-]{2,60}$/.test(customerName)) {
      return res.status(400).json({ success: false, message: 'Customer name should only contain letters and spaces.' });
    }

    const sanitizedPhone = sanitizeIndianPhone(customerPhone);
    if (!sanitizedPhone || sanitizedPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'A valid 10-digit mobile number starting with 6, 7, 8, or 9 is required for WhatsApp billing.',
      });
    }

    // 1. Resolve Store & City
    // For non-SUPER_ADMIN staff, strictly enforce their assigned boutique counter (IDOR Prevention)
    let resolvedStoreId = req.user.role === 'SUPER_ADMIN' 
      ? (storeId || req.user.assignedStoreId) 
      : req.user.assignedStoreId;

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

    // Validate billing:discount authorization for non-superadmins
    if (numDiscountValue > 0 && discountType !== 'NONE' && req.user.role !== 'SUPER_ADMIN') {
      const userPerms = req.user.permissions || [];
      if (!userPerms.includes('billing:discount')) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Your account does not have permission (billing:discount) to apply manual discounts.',
        });
      }
    }

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

    // 4. Resolve Customer
    let resolvedCustomerId = customerId || null;
    if (!resolvedCustomerId) {
      const existingCust = await prisma.customer.findUnique({
        where: { phone: sanitizedPhone },
      });
      if (existingCust) {
        resolvedCustomerId = existingCust.id;
        if (existingCust.name !== customerName) {
          await prisma.customer.update({
            where: { id: existingCust.id },
            data: { name: customerName },
          });
        }
      } else {
        const newCust = await prisma.customer.create({
          data: {
            name: customerName,
            phone: sanitizedPhone,
            email: customerData?.email?.trim() || null,
            city: store.city.name,
            address: customerData?.address?.trim() || null,
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

    // 6. Generate Dynamic UPI QR Code payload and atomic transaction with concurrency retry loop
    const effectiveUpiAmount = paymentMethod === 'SPLIT' ? upiAmount : (paymentMethod === 'CREDIT' ? 0 : grandTotal);
    const storeUpi = store.upiId || process.env.STORE_UPI_ID || 'jjperfumes@icici';
    const storeName = store.name || 'J I PERFUME';
    const finalNotes = [notes, splitSummary].filter(Boolean).join(' | ');

    const generateNextInvoiceNumber = async () => {
      const year = new Date().getFullYear();
      const prefix = `JJ-${year}-`;
      const latest = await prisma.invoice.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      });
      let nextSeq = 1;
      if (latest?.invoiceNumber) {
        const match = latest.invoiceNumber.match(new RegExp(`^JJ-${year}-(\\d+)$`));
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1;
        } else {
          const totalCount = await prisma.invoice.count();
          nextSeq = totalCount + 1;
        }
      } else {
        const totalCount = await prisma.invoice.count();
        nextSeq = totalCount + 1;
      }
      return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    };

    let result = null;
    let invoiceNumber = null;
    let upiString = null;
    let qrDataUrl = null;

    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        invoiceNumber = await generateNextInvoiceNumber();

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

        result = await prisma.$transaction(async (tx) => {
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
          const newlyLowStockItems = [];
          for (const item of items) {
            // Decrement store-specific stock balance
            const updatedBal = await tx.stockBalance.upsert({
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

            // Concurrency-safe low stock evaluation
            const trackRes = await evaluateStockTrackingInTx(tx, {
              productId: item.productId,
              storeId: store.id,
              newQuantity: updatedBal.quantity,
            });
            if (trackRes.newlyLowStock) {
              newlyLowStockItems.push(trackRes.item);
            }

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

          return { invoice: createdInvoice, payments: paymentRecords, newlyLowStockItems };
        });

        // Break on successful commit
        break;
      } catch (txErr) {
        if ((txErr.code === 'P2002' || txErr.message?.includes('invoiceNumber')) && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 50));
          continue;
        }
        throw txErr;
      }
    }

    const primaryPayment = result.payments.find((p) => p.status === 'PENDING') || result.payments[0];

    // Save invoice PDF locally to backend/invoices/
    try {
      const fullInvoiceForPdf = {
        ...result.invoice,
        store,
        customer: result.invoice.customer || customerData,
        items: result.invoice.items,
        payments: result.payments,
      };
      await saveInvoicePdfLocally(fullInvoiceForPdf);
    } catch (saveErr) {
      console.warn('Failed to save local PDF on invoice creation:', saveErr.message);
    }

    // Trigger WhatsApp notification if payment is already complete (Cash/Card/Split Direct)
    let whatsappResult = null;
    if (result.invoice.paymentStatus === 'PAID') {
      try {
        whatsappResult = await sendWhatsAppInvoice(result.invoice);
      } catch (wsErr) {
        console.warn('WhatsApp invoice dispatch warning:', wsErr.message);
      }
    }

    // Trigger Automatic Low Stock WhatsApp Alert for newly low-stock items
    let lowStockAlertResult = null;
    if (result.newlyLowStockItems && result.newlyLowStockItems.length > 0) {
      try {
        lowStockAlertResult = await dispatchLowStockWhatsAppNotification(result.newlyLowStockItems);
      } catch (wsErr) {
        console.error('[Automatic Low Stock WhatsApp Error]:', wsErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        ...result.invoice,
        payment: primaryPayment,
        payments: result.payments,
        whatsapp: whatsappResult,
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
    const { search, status, paymentMethod, storeId, cityId, limit = 10, page = 1, sortBy, sortOrder } = req.query;

    const where = {};

    if (status && status !== 'ALL') {
      where.paymentStatus = status;
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = paymentMethod;
    }

    // CASHIER restriction: Cashier is strictly restricted to viewing invoices of their assigned store
    if (req.user.role === 'CASHIER' && req.user.assignedStoreId) {
      where.storeId = req.user.assignedStoreId;
    } else {
      if (storeId && storeId !== 'ALL') {
        where.storeId = storeId;
      } else if (cityId && cityId !== 'ALL') {
        where.store = { cityId };
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { phone: { contains: q } } },
        { customer: { email: { contains: q } } },
        { store: { name: { contains: q } } },
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy) {
      const allowed = ['createdAt', 'invoiceNumber', 'grandTotal', 'paidAmount', 'dueAmount', 'paymentStatus'];
      if (allowed.includes(sortBy)) {
        orderBy = { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };
      }
    }

    const take = Math.max(1, parseInt(limit, 10) || 10);
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const skip = (pageNum - 1) * take;

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
        orderBy,
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
        page: pageNum,
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

    // CASHIER restriction: Cannot view invoices belonging to other outlets
    if (req.user.role === 'CASHIER' && req.user.assignedStoreId && invoice.storeId !== req.user.assignedStoreId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view invoices from another store.',
      });
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

    // CASHIER restriction: Cannot cancel invoices belonging to other outlets
    if (req.user.role === 'CASHIER' && req.user.assignedStoreId && invoice.storeId !== req.user.assignedStoreId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to cancel invoices from another store.',
      });
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
          const restoredBal = await tx.stockBalance.upsert({
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

          // Concurrency-safe check to reset lowStockAlertSent if quantity restored > 10
          await evaluateStockTrackingInTx(tx, {
            productId: item.productId,
            storeId: invoice.storeId,
            newQuantity: restoredBal.quantity,
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

    // CASHIER restriction: Cannot collect due payment for another store's invoice
    if (req.user.role === 'CASHIER' && req.user.assignedStoreId && invoice.storeId && invoice.storeId !== req.user.assignedStoreId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to collect payments for another store.',
      });
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

    // Trigger WhatsApp notification for payment update
    let whatsappResult = null;
    try {
      whatsappResult = await sendWhatsAppInvoice(result.invoice);
    } catch (wsErr) {
      console.warn('WhatsApp collection dispatch warning:', wsErr.message);
    }

    return res.json({
      success: true,
      message: `Successfully collected ₹${numAmount}. Outstanding Due: ₹${result.invoice.dueAmount}`,
      data: {
        ...result.invoice,
        whatsapp: whatsappResult,
      },
    });
  } catch (error) {
    console.error('collectDuePayment error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to collect due payment' });
  }
};

/**
 * Manually trigger or re-send WhatsApp bill for any existing invoice
 */
export const sendWhatsAppBill = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        store: { include: { city: true } },
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // CASHIER restriction: Cannot dispatch WhatsApp bills for another store
    if (req.user?.role === 'CASHIER' && req.user?.assignedStoreId && invoice.storeId && invoice.storeId !== req.user.assignedStoreId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to send WhatsApp bills for another store.',
      });
    }

    const result = await sendWhatsAppInvoice(invoice);

    return res.json({
      success: !!result.success,
      message: result.message || (result.success ? 'WhatsApp bill sent successfully' : 'WhatsApp delivery failed'),
      data: result,
    });
  } catch (error) {
    console.error('sendWhatsAppBill error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to dispatch WhatsApp bill' });
  }
};

/**
 * Generate and stream official Tax Invoice PDF directly
 */
export const getInvoicePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        store: { include: { city: true } },
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice);

    // Save a copy to local backend/invoices/ folder
    try {
      await saveInvoicePdfLocally(invoice, pdfBuffer);
    } catch (saveErr) {
      console.warn('Failed to save local PDF in getInvoicePdf:', saveErr.message);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="JJ-Perfume-Invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    console.error('getInvoicePdf error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to generate PDF invoice' });
  }
};
