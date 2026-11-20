/**
 * Automated Low-Stock Tracking & WhatsApp Alert Dispatch Service
 *
 * Implements real-time, concurrency-safe low-stock detection and notification tracking:
 * 1. Automatic detection whenever a product's stock at a store becomes <= threshold (default: 10 units).
 * 2. Sends WhatsApp notifications ONLY for newly low-stock products.
 * 3. Never resends notifications for products that have already been notified while stock remains <= 10.
 * 4. Resets notification tracking if stock increases above 10, enabling future alerts if stock drops again.
 * 5. Handles multiple products and stores independently.
 * 6. Dispatches only to configured alert phone numbers (LOW_STOCK_ALERT_NUMBERS).
 * 7. Guaranteed concurrency-safety via atomic database conditional updates inside Prisma transactions.
 */

import { prisma } from '../config/prisma.js';
import {
  getLowStockAlertNumbers,
  sendWhatsAppTextMessage,
} from './whatsapp.service.js';
import {
  generateLowStockPdfBuffer,
  saveLowStockPdfLocally,
} from './pdf.service.js';

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

/**
 * Get current configured low stock threshold
 */
export function getLowStockThreshold() {
  const val = parseInt(process.env.LOW_STOCK_THRESHOLD, 10);
  return !isNaN(val) && val > 0 ? val : DEFAULT_LOW_STOCK_THRESHOLD;
}

/**
 * Format newly low stock products into the standard luxury WhatsApp message.
 * Supports single product or multiple products across one or multiple stores.
 *
 * @param {Array<Object>} items - Array of { productId, productName, sku, quantity, reorderLevel, storeId, storeName, cityName }
 * @param {Object} options
 * @param {number} options.threshold
 * @returns {string} WhatsApp text message
 */
export function formatNewlyLowStockAlertMessage(items, { threshold = getLowStockThreshold() } = {}) {
  if (!items || items.length === 0) return '';

  // 1. Single product format
  if (items.length === 1) {
    const item = items[0];
    const rawStore = (item.storeName || 'Main Boutique').trim();
    const rawCity = (item.cityName || '').trim();
    const sName = rawCity
      ? (rawStore.toUpperCase().includes(rawCity.toUpperCase())
          ? rawStore.toUpperCase()
          : `${rawStore.toUpperCase()} (${rawCity.toUpperCase()})`)
      : rawStore.toUpperCase();
    const pName = (item.productName || 'Fragrance').trim();
    const sku = (item.sku || 'N/A').trim();
    const minLevel = item.reorderLevel || threshold || DEFAULT_LOW_STOCK_THRESHOLD;

    return `⚠️ *J I PERFUME – LOW STOCK ALERT*

Dear Team,

Below is the low-stock report:

━━━━━━━━━━━━━━━━
🏬 *STORE: ${sName}*

1. *${pName}*
   SKU: ${sku} | Stock: ${item.quantity} Pcs | Minimum: ${minLevel} Pcs

━━━━━━━━━━━━━━━━

📊 *SUMMARY*
Total Stores: 1
Total Low Stock Products: 1

🔔 *ACTION REQUIRED*
Please review the stock levels and arrange replenishment for the above products.

*J I PERFUME*
_Automated Inventory Alert_`;
  }

  // 2. Multiple products (grouped by store outlet)
  const storeMap = new Map();
  for (const it of items) {
    const sid = it.storeId || 'default';
    if (!storeMap.has(sid)) {
      storeMap.set(sid, {
        storeName: (it.storeName || 'Main Boutique').trim(),
        cityName: (it.cityName || '').trim(),
        items: [],
      });
    }
    storeMap.get(sid).items.push(it);
  }

  const storeGroups = Array.from(storeMap.values());
  const isMultiStore = storeGroups.length > 1;

  let body = `⚠️ *J I PERFUME – LOW STOCK ALERT*\n\n`;
  body += `Dear Team,\n\n`;
  body += isMultiStore
    ? `Below is the consolidated low-stock report for all stores.\n\n`
    : `Below is the low-stock report:\n\n`;

  for (const group of storeGroups) {
    const rawStore = (group.storeName || 'Main Boutique').trim();
    const rawCity = (group.cityName || '').trim();
    const sName = rawCity
      ? (rawStore.toUpperCase().includes(rawCity.toUpperCase())
          ? rawStore.toUpperCase()
          : `${rawStore.toUpperCase()} (${rawCity.toUpperCase()})`)
      : rawStore.toUpperCase();

    body += `━━━━━━━━━━━━━━━━\n`;
    body += `🏬 *STORE: ${sName}*\n\n`;

    group.items.forEach((it, index) => {
      const minLevel = it.reorderLevel || threshold || DEFAULT_LOW_STOCK_THRESHOLD;
      const pName = (it.productName || 'Fragrance').trim();
      const sku = (it.sku || 'N/A').trim();
      body += `${index + 1}. *${pName}*\n`;
      body += `   SKU: ${sku} | Stock: ${it.quantity} Pcs | Minimum: ${minLevel} Pcs\n\n`;
    });
  }

  body += `━━━━━━━━━━━━━━━━\n\n`;
  body += `📊 *SUMMARY*\n`;
  body += `Total Stores: ${storeGroups.length}\n`;
  body += `Total Low Stock Products: ${items.length}\n\n`;
  body += `🔔 *ACTION REQUIRED*\n`;
  body += `Please review the stock levels and arrange replenishment for the above products.\n\n`;
  body += `*J I PERFUME*\n`;
  body += `_Automated Inventory Alert_`;

  return body;
}

/**
 * Evaluates and updates low-stock tracking inside an active Prisma transaction.
 * Concurrency-safe: utilizes atomic update conditional checks on InnoDB row locks.
 *
 * @param {Object} tx - Active Prisma transaction client
 * @param {Object} params
 * @param {string} params.productId
 * @param {string} params.storeId
 * @param {number} params.newQuantity - Updated stock quantity
 * @param {number} [params.threshold] - Low stock threshold (defaults to configured threshold)
 * @returns {Promise<{ newlyLowStock: boolean, item?: Object, restored?: boolean, alreadyNotified?: boolean }>}
 */
export async function evaluateStockTrackingInTx(tx, {
  productId,
  storeId,
  newQuantity,
  threshold = getLowStockThreshold(),
}) {
  const qty = Number(newQuantity);

  // Scenario 1: Stock is healthy / restored above threshold
  if (qty > threshold) {
    // If it was previously marked as notified, reset flag so future drops <= threshold will trigger anew
    await tx.stockBalance.updateMany({
      where: {
        productId,
        storeId,
        lowStockAlertSent: true,
      },
      data: {
        lowStockAlertSent: false,
      },
    });

    return { newlyLowStock: false, restored: true };
  }

  // Scenario 2: Stock is at or below threshold (<= 10)
  // Attempt atomic transition: ONLY succeed if lowStockAlertSent is currently false
  const claimResult = await tx.stockBalance.updateMany({
    where: {
      productId,
      storeId,
      quantity: { lte: threshold },
      lowStockAlertSent: false,
    },
    data: {
      lowStockAlertSent: true,
      lastNotifiedAt: new Date(),
    },
  });

  if (claimResult.count > 0) {
    // This transaction won the claim! Load product and store details for the notification.
    const balance = await tx.stockBalance.findUnique({
      where: {
        productId_storeId: { productId, storeId },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            volumeMl: true,
            reorderLevel: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            city: { select: { name: true } },
          },
        },
      },
    });

    return {
      newlyLowStock: true,
      item: {
        productId,
        productName: balance?.product?.name || 'Fragrance',
        sku: balance?.product?.sku || 'N/A',
        volumeMl: balance?.product?.volumeMl || 100,
        quantity: qty,
        reorderLevel: balance?.reorderLevel || balance?.product?.reorderLevel || threshold,
        storeId,
        storeName: balance?.store?.name || 'Main Boutique',
        cityName: balance?.store?.city?.name || 'Mandvi',
      },
    };
  }

  // Already notified in this low-stock cycle or claimed concurrently
  return { newlyLowStock: false, alreadyNotified: true };
}

/**
 * Dispatch automated WhatsApp low stock alert to all configured recipients.
 * Should be called AFTER transaction commit.
 *
 * @param {Array<Object>} newlyLowStockItems
 * @param {Object} [options]
 * @param {boolean} [options.dryRun=false]
 * @returns {Promise<Object>} Dispatch summary
 */
export async function dispatchLowStockWhatsAppNotification(newlyLowStockItems, { dryRun = false } = {}) {
  if (!newlyLowStockItems || newlyLowStockItems.length === 0) {
    return { dispatched: false, reason: 'No newly low-stock items to notify', count: 0 };
  }

  const recipients = getLowStockAlertNumbers();
  const threshold = getLowStockThreshold();

  if (!recipients.length) {
    console.warn(`\x1b[33m⚠️ [Low Stock WhatsApp]: No valid recipient phone numbers in LOW_STOCK_ALERT_NUMBERS.\x1b[0m`);
    return {
      dispatched: false,
      reason: 'No recipients configured in LOW_STOCK_ALERT_NUMBERS',
      count: newlyLowStockItems.length,
    };
  }

  const message = formatNewlyLowStockAlertMessage(newlyLowStockItems, { threshold });

  console.log(`\n\x1b[33m============================================================\x1b[0m`);
  console.log(`\x1b[33m⚠️  [AUTOMATIC LOW STOCK WHATSAPP ALERT TRIGGERED]\x1b[0m`);
  console.log(`\x1b[1m📦 Newly Low-Stock Items (${newlyLowStockItems.length}):\x1b[0m`);
  for (const it of newlyLowStockItems) {
    console.log(`   • ${it.productName} (SKU: ${it.sku}) -> Stock: ${it.quantity} Pcs at ${it.storeName}`);
  }
  console.log(`\x1b[1m📱 Dispatched To:\x1b[0m ${recipients.map((n) => `+91 ${n}`).join(', ')}`);
  console.log(`\x1b[33m============================================================\x1b[0m\n`);

  // Group newly low-stock items by store outlet for PDF table report
  const storeMap = new Map();
  for (const it of newlyLowStockItems) {
    const sid = it.storeId || 'default';
    if (!storeMap.has(sid)) {
      storeMap.set(sid, {
        storeId: sid,
        storeName: (it.storeName || 'Main Boutique').trim(),
        cityName: (it.cityName || '').trim(),
        items: [],
      });
    }
    storeMap.get(sid).items.push({
      productId: it.productId,
      productName: (it.productName || 'Fragrance').trim(),
      sku: (it.sku || 'N/A').trim(),
      volumeMl: it.volumeMl || 100,
      quantity: it.quantity,
      reorderLevel: it.reorderLevel || threshold || DEFAULT_LOW_STOCK_THRESHOLD,
    });
  }
  const storeGroups = Array.from(storeMap.values());

  // Generate Table-Format Low Stock PDF Report and save locally
  let pdfBuffer = null;
  let savedPdfInfo = null;
  try {
    pdfBuffer = await generateLowStockPdfBuffer({
      storeGroups,
      totalItems: newlyLowStockItems.length,
      threshold,
      generatedAt: new Date(),
    });
    savedPdfInfo = await saveLowStockPdfLocally(pdfBuffer);
    console.log(`\x1b[32m✔ [Low Stock Alert]: Table PDF report generated successfully (${pdfBuffer.length} bytes).\x1b[0m`);
  } catch (pdfErr) {
    console.warn('[Low Stock Alert]: PDF generation warning:', pdfErr.message);
  }

  // Pre-upload PDF to Meta Media so all recipients share the exact same mediaId
  let preUploadedMediaId = null;
  if (!dryRun && pdfBuffer) {
    try {
      const apiUrl = process.env.WHATSAPP_API || 'https://crmapi.1automations.com/api/meta';
      const apiVersion = process.env.API_VERSION || 'v19.0';
      const phoneNumberId = process.env.PHONE_NUMBER_ID || '1267319776475923';
      const accessToken = process.env.ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

      if (accessToken && phoneNumberId) {
        const cleanBaseUrl = apiUrl.replace(/\/+$/, '');
        const mediaEndpoint = cleanBaseUrl.endsWith('/messages')
          ? cleanBaseUrl.replace(/\/messages$/, '/media')
          : `${cleanBaseUrl}/${apiVersion}/${phoneNumberId}/media`;

        const formData = new FormData();
        formData.append(
          'file',
          new Blob([pdfBuffer], { type: 'application/pdf' }),
          'JI-Perfume-Low-Stock-Report.pdf'
        );
        formData.append('type', 'application/pdf');
        formData.append('messaging_product', 'whatsapp');

        const uploadRes = await fetch(mediaEndpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => null);
        if (uploadRes.ok && uploadData?.id) {
          preUploadedMediaId = uploadData.id;
          console.log(`\x1b[32m✔ [WhatsApp] Low Stock PDF uploaded to Meta Media. ID: ${preUploadedMediaId}\x1b[0m`);
        } else {
          console.warn('[WhatsApp] Media upload response warning:', uploadData);
        }
      }
    } catch (upErr) {
      console.warn('[WhatsApp] Pre-upload media error:', upErr.message);
    }
  }

  const templateOpts = {
    items: newlyLowStockItems,
    storeCount: storeGroups.length,
    totalItems: newlyLowStockItems.length,
    pdfBuffer,
    pdfMediaId: preUploadedMediaId,
    pdfFilename: 'JI-Perfume-Low-Stock-Report.pdf',
    pdfLocalPath: savedPdfInfo?.filePath,
    pdfUrl: savedPdfInfo?.relativeUrl,
  };

  let dispatchResults = [];
  if (!dryRun) {
    const settled = await Promise.allSettled(
      recipients.map((phone) => sendWhatsAppTextMessage(phone, message, templateOpts))
    );
    dispatchResults = settled.map((r, i) => ({
      phone: recipients[i],
      status: r.status,
      result: r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message },
    }));
  }

  return {
    dispatched: !dryRun,
    itemCount: newlyLowStockItems.length,
    items: newlyLowStockItems,
    recipients: recipients.map((phone, idx) => ({
      phone,
      status: dispatchResults[idx]?.status || (dryRun ? 'dry_run' : 'sent'),
      result: dispatchResults[idx]?.result || null,
    })),
    messagePreview: message.slice(0, 300) + '...',
  };
}
