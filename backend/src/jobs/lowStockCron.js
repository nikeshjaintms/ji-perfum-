/**
 * Automated Low-Stock WhatsApp Alert Cron Job
 *
 * Runs on a configured schedule (default: Every day at 09:00 AM IST)
 * Scans all stores and products for inventory <= threshold (default: 10 units)
 * Compiles an executive digest grouped by store outlet and dispatches via WhatsApp
 * to all recipients defined in LOW_STOCK_ALERT_NUMBERS.
 */

import cron from 'node-cron';
import { prisma } from '../config/prisma.js';
import {
  getLowStockAlertNumbers,
  sendWhatsAppTextMessage,
  formatLowStockDigestMessage,
} from '../services/whatsapp.service.js';
import {
  generateLowStockPdfBuffer,
  saveLowStockPdfLocally,
} from '../services/pdf.service.js';

/**
 * Execute the low-stock inventory audit and send WhatsApp notification
 * @param {Object} options
 * @param {boolean} options.dryRun - When true, prepares digest without sending HTTP requests
 * @returns {Promise<Object>} Execution summary
 */
export async function runLowStockCheckJob({ dryRun = false } = {}) {
  try {
    const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 10;
    console.log(`\n\x1b[36m============================================================\x1b[0m`);
    console.log(`\x1b[36m⏰ [CRON JOB STARTED]: Low-Stock Inventory Scan (Threshold <= ${threshold} units)\x1b[0m`);
    console.log(`\x1b[36m============================================================\x1b[0m`);

    // 0. Reset any previously notified stock balances that have been replenished (> threshold)
    await prisma.stockBalance.updateMany({
      where: {
        quantity: { gt: threshold },
        lowStockAlertSent: true,
      },
      data: {
        lowStockAlertSent: false,
      },
    });

    // 1. Query only newly low stock balances (not yet notified) at or below threshold for active products
    const lowStockBalances = await prisma.stockBalance.findMany({
      where: {
        quantity: { lte: threshold },
        product: { isActive: true },
        lowStockAlertSent: false,
      },
      include: {
        product: {
          include: { category: true },
        },
        store: {
          include: { city: true },
        },
      },
      orderBy: [
        { store: { name: 'asc' } },
        { quantity: 'asc' },
      ],
    });

    if (!lowStockBalances.length) {
      console.log(`\x1b[32m✔ [CRON JOB]: All store inventory levels healthy (> ${threshold} units) or already notified. No alert needed.\x1b[0m\n`);
      return {
        success: true,
        status: 'HEALTHY_OR_NOTIFIED',
        message: `All product inventory levels are healthy or already notified (threshold <= ${threshold} units).`,
        totalLowStock: 0,
        dispatched: false,
      };
    }

    // 2. Group items by store outlet
    const storeMap = new Map();
    for (const b of lowStockBalances) {
      const storeId = b.storeId;
      const storeName = b.store?.name || 'Main Boutique';
      const cityName = b.store?.city?.name || 'Mandvi';
      if (!storeMap.has(storeId)) {
        storeMap.set(storeId, {
          storeId,
          storeName,
          cityName,
          items: [],
        });
      }
      storeMap.get(storeId).items.push({
        productId: b.productId,
        productName: b.product.name,
        sku: b.product.sku,
        volumeMl: b.product.volumeMl,
        quantity: b.quantity,
        reorderLevel: b.reorderLevel || b.product?.reorderLevel || threshold || 10,
      });
    }

    const storeGroups = Array.from(storeMap.values());
    const totalItems = lowStockBalances.length;

    console.log(`\x1b[33m⚠️ [CRON JOB]: Found ${totalItems} low-stock item(s) across ${storeGroups.length} store outlet(s).\x1b[0m`);

    // 3. Format WhatsApp Digest Message
    const message = formatLowStockDigestMessage({
      storeGroups,
      totalItems,
      threshold,
    });

    // 4. Retrieve configured phone numbers (e.g. 9904804635, 9725520081)
    const recipients = getLowStockAlertNumbers();
    if (!recipients.length) {
      console.warn(`\x1b[33m⚠️ [CRON JOB]: No valid recipient phone numbers found in LOW_STOCK_ALERT_NUMBERS.\x1b[0m`);
      return {
        success: false,
        status: 'NO_RECIPIENTS',
        message: 'No recipient phone numbers configured in LOW_STOCK_ALERT_NUMBERS.',
        totalLowStock: totalItems,
        dispatched: false,
      };
    }

    console.log(`📱 [CRON JOB]: Dispatching digest to ${recipients.length} number(s): ${recipients.map((n) => `+91 ${n}`).join(', ')}`);

    // 3b. Generate Luxury Table-Format Low Stock PDF Report
    let pdfBuffer = null;
    let savedPdfInfo = null;
    try {
      pdfBuffer = await generateLowStockPdfBuffer({
        storeGroups,
        totalItems,
        threshold,
        generatedAt: new Date(),
      });
      savedPdfInfo = await saveLowStockPdfLocally(pdfBuffer);
      console.log(`\x1b[32m✔ [CRON JOB]: Low Stock Table-Format PDF generated successfully (${pdfBuffer.length} bytes).\x1b[0m`);
    } catch (pdfErr) {
      console.warn(`\x1b[33m⚠️ [CRON JOB]: PDF generation error:\x1b[0m`, pdfErr.message);
    }

    let dispatchResults = [];
    if (!dryRun) {
      // Map ALL low stock products so all products are displayed in the WhatsApp message
      const allLowItems = lowStockBalances.map((b) => ({
        storeName: b.store?.name || 'Main Boutique',
        productName: b.product?.name || 'Fragrance',
        sku: b.product?.sku || 'N/A',
        volumeMl: b.product?.volumeMl || null,
        quantity: b.quantity,
        reorderLevel: b.reorderLevel || b.product?.reorderLevel || threshold || 10,
      }));

      // Format store-wise items section with store headers and double line breaks between products
      let storeItemsFormatted = '';
      for (const group of storeGroups) {
        const sName = group.cityName
          ? (group.storeName.toUpperCase().includes(group.cityName.toUpperCase())
              ? group.storeName.toUpperCase()
              : `${group.cityName.toUpperCase()} – ${group.storeName.toUpperCase()}`)
          : group.storeName.toUpperCase();

        let block = `━━━━━━━━━━━━━━━━\n🏬 *STORE: ${sName}*\n\n`;
        let addedInGroup = 0;
        for (let i = 0; i < group.items.length; i++) {
          const it = group.items[i];
          const minLvl = it.reorderLevel || threshold || 10;
          const itemBlock = `${i + 1}. *${it.productName}*\n   SKU: ${it.sku} | Stock: ${it.quantity} Pcs | Minimum: ${minLvl} Pcs\n\n`;
          if (storeItemsFormatted.length + block.length + itemBlock.length > 980) {
            break;
          }
          block += itemBlock;
          addedInGroup++;
        }
        if (addedInGroup > 0 && storeItemsFormatted.length + block.length <= 1000) {
          storeItemsFormatted += block;
        }
      }

      const templateOpts = {
        items: allLowItems,
        storeItemsFormatted,
        storeCount: storeGroups.length,
        header: `⚠️ J I PERFUME – LOW STOCK ALERT`,
        summary: `📊 SUMMARY: Total Stores: ${storeGroups.length} | Total Products: ${totalItems}`,
        footer: '🔔 ACTION REQUIRED: Please review stock levels and arrange replenishment.',
        pdfBuffer,
        pdfFilename: 'JI-Perfume-Low-Stock-Report.pdf',
        pdfLocalPath: savedPdfInfo?.filePath,
        pdfUrl: savedPdfInfo?.relativeUrl,
      };

      const settled = await Promise.allSettled(
        recipients.map((phone) => sendWhatsAppTextMessage(phone, message, templateOpts))
      );
      dispatchResults = settled.map((r, i) => ({
        phone: recipients[i],
        status: r.status,
        result: r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message },
      }));
      console.log(`\x1b[32m✔ [CRON JOB COMPLETED]: All ${totalItems} low-stock products dispatched to ${recipients.join(', ')}.\x1b[0m`);

      // Mark dispatched balances as notified to prevent duplicate alerts
      const balanceIds = lowStockBalances.map((b) => b.id);
      await prisma.stockBalance.updateMany({
        where: { id: { in: balanceIds } },
        data: {
          lowStockAlertSent: true,
          lastNotifiedAt: new Date(),
        },
      });
    } else {
      console.log(`\x1b[34mℹ️ [CRON JOB DRY RUN]: Skipping actual HTTP WhatsApp delivery.\x1b[0m\n`);
    }

    return {
      success: true,
      status: 'ALERT_DISPATCHED',
      totalLowStock: totalItems,
      storeGroupsCount: storeGroups.length,
      recipients: recipients.map((phone, idx) => ({
        phone,
        status: dispatchResults[idx]?.status || (dryRun ? 'dry_run' : 'sent'),
      })),
      dispatched: !dryRun,
      pdfGenerated: Boolean(pdfBuffer),
      pdfFilename: savedPdfInfo?.filename,
      pdfUrl: savedPdfInfo?.relativeUrl,
      messagePreview: message.slice(0, 300) + '...',
    };
  } catch (error) {
    console.error(`\x1b[31m✖ [CRON JOB ERROR]:\x1b[0m`, error.message);
    return {
      success: false,
      status: 'ERROR',
      error: error.message,
    };
  }
}

/**
 * Initialize the recurring cron job schedule
 */
export function initLowStockCron() {
  if (process.env.ENABLE_LOW_STOCK_CRON === 'false') {
    console.log(`ℹ️ [Low Stock Cron]: Background cron is disabled via ENABLE_LOW_STOCK_CRON=false.`);
    return null;
  }

  // Standard schedule: Daily at 09:00 AM IST (Never defaults to arbitrary daytime minutes)
  const cronSchedule = process.env.LOW_STOCK_CRON_SCHEDULE || '0 9 * * *';
  const isValid = cron.validate(cronSchedule);

  if (!isValid) {
    console.error(`\x1b[31m[Low Stock Cron Error]: Invalid cron expression "${cronSchedule}". Defaulting to '0 9 * * *'.\x1b[0m`);
  }

  const effectiveSchedule = isValid ? cronSchedule : '0 9 * * *';

  console.log(`⏰ [Low Stock Cron]: Initialized with schedule "${effectiveSchedule}" (Asia/Kolkata)`);

  const task = cron.schedule(
    effectiveSchedule,
    async () => {
      console.log(`[Low Stock Cron]: Triggered by schedule at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
      await runLowStockCheckJob();
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  // Strictly do NOT run on server startup unless explicitly configured in environment
  if (process.env.RUN_CRON_ON_STARTUP === 'true') {
    console.log(`[Low Stock Cron]: RUN_CRON_ON_STARTUP is enabled. Running initial scan...`);
    runLowStockCheckJob().catch((err) => console.error('[Low Stock Cron Startup Error]:', err.message));
  }

  return task;
}
