/**
 * WhatsApp Notification Service for JJ Perfume ERP
 * Integrates with WHATSAPP_API (Fast2SMS / Meta Cloud / Web API)
 * Sends electronic bill receipts directly to the customer's WhatsApp number.
 */

import { generateInvoicePdfBuffer, saveInvoicePdfLocally } from './pdf.service.js';

/**
 * Format an invoice into an elegant WhatsApp receipt message
 */
export function formatInvoiceWhatsAppMessage(invoice) {
  const store = invoice.store || {};
  const city = store.city?.name || 'Mandvi';
  const customer = invoice.customer || {};
  const customerName = customer.name || 'Valued Customer';
  const storeName = store.name || process.env.STORE_NAME || 'JJ PERFUME';
  const storePhone = store.phone || process.env.STORE_PHONE || '+91 93161 41552';
  const storeGstin = store.gstin || process.env.STORE_GSTIN || '27AABCJ1234F1Z5';

  const dateObj = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
  const dateStr = dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const grandTotal = Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const subtotal = Number(invoice.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const discountAmount = Number(invoice.discountAmount || 0);
  const taxAmount = Number(invoice.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const paidAmount = Number(invoice.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const dueAmount = Number(invoice.dueAmount || 0);

  // Format line items
  const itemsText = (invoice.items || []).map((item, index) => {
    const pName = item.productName || item.product?.name || 'Fragrance';
    const vol = item.volumeMl || item.product?.volumeMl ? ` (${item.volumeMl || item.product?.volumeMl}ml)` : '';
    const itemTotal = Number(item.totalAmount || 0).toLocaleString('en-IN');
    return `${index + 1}. *${pName}*${vol}\n   Qty: ${item.quantity} × ₹${Number(item.unitPrice).toLocaleString('en-IN')} = *₹${itemTotal}*`;
  }).join('\n');

  let discountLine = '';
  if (discountAmount > 0) {
    discountLine = `🏷️ *Discount:* -₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
  }

  let dueLine = '';
  if (dueAmount > 0.01) {
    dueLine = `⚠️ *Balance Due:* ₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n`;
  }

  const paymentMethodLabel = {
    'UPI_QR': 'UPI QR',
    'CASH': 'Cash',
    'CARD': 'Card',
    'SPLIT': 'Split Tender',
    'CREDIT': 'Credit / Due',
  }[invoice.paymentMethod] || invoice.paymentMethod || 'Paid';

  const paymentStatusLabel = invoice.paymentStatus === 'PAID' ? 'PAID IN FULL ✅' : 'PARTIALLY PAID ⏳';

  const appBaseUrl = process.env.APP_URL || process.env.BACKEND_URL || 'http://localhost:5000';
  const pdfDownloadLine = invoice.id
    ? `📄 *Download Official Tax Invoice PDF:*\n${appBaseUrl}/api/v1/billing/${invoice.id}/pdf\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    : '';

  return `✨ *${storeName.toUpperCase()} - TAX INVOICE* ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━
Dear *${customerName}*,
Thank you for shopping at *${storeName} (${city})*!

🧾 *Bill Number:* ${invoice.invoiceNumber}
📅 *Date:* ${dateStr} at ${timeStr}
💳 *Payment:* ${paymentMethodLabel} · *${paymentStatusLabel}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*PURCHASED FRAGRANCES:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Subtotal:* ₹${subtotal}
${discountLine}*GST (18%):* ₹${taxAmount}
*GRAND TOTAL: ₹${grandTotal}*
*AMOUNT PAID: ₹${paidAmount}*
${dueLine}━━━━━━━━━━━━━━━━━━━━━━━━━━
${pdfDownloadLine}📍 *Outlet:* ${storeName}, ${city}
📞 *Helpdesk:* ${storePhone}
🏛️ *GSTIN:* ${storeGstin}
Subject to Local Jurisdiction (${city}).

We hope you love your fragrance! Visit us again soon. 🌸`;
}

/**
 * Sanitize a phone number into a 10-digit Indian mobile number
 */
export function sanitizeIndianPhone(rawPhone) {
  if (!rawPhone) return '';
  const cleaned = String(rawPhone).replace(/\D/g, '');
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return cleaned;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0') && /^[6-9]/.test(cleaned.slice(1))) {
    return cleaned.slice(1);
  }
  if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]/.test(cleaned.slice(2))) {
    return cleaned.slice(2);
  }
  return '';
}

/**
 * Retrieve configured recipient phone numbers for low-stock WhatsApp alerts
 * Comma-separated list from process.env.LOW_STOCK_ALERT_NUMBERS or process.env.ALERT_WHATSAPP_NUMBERS
 * Defaults to: 9904804635, 9725520081
 */
export function getLowStockAlertNumbers() {
  const envVal = process.env.LOW_STOCK_ALERT_NUMBERS || process.env.ALERT_WHATSAPP_NUMBERS || '9904804635, 9725520081';
  return envVal
    .split(',')
    .map((s) => sanitizeIndianPhone(s.trim()))
    .filter((p) => p && p.length === 10);
}

/**
 * Format a low-stock inventory alert message for WhatsApp
 */
/**
 * Format a low-stock inventory alert message for WhatsApp
 * Matches exact format: Store, Product, SKU, Stock Pcs, Minimum Pcs (No PDF).
 */
export function formatLowStockAlertMessage({ product, store, currentQuantity, threshold = 10 }) {
  const storeName = store?.name || process.env.STORE_NAME || 'STORE';
  const productName = product?.name || 'Fragrance';
  const sku = product?.sku || 'N/A';
  const minLevel = product?.reorderLevel || threshold || 10;
  const qty = Number(currentQuantity);

  return `⚠️ *J I PERFUME – LOW STOCK ALERT*

Dear Team,

Below is the low-stock report:

━━━━━━━━━━━━━━━━
🏬 *STORE: ${storeName.toUpperCase()}*

1. *${productName}*
   SKU: ${sku} | Stock: ${qty} Pcs | Minimum: ${minLevel} Pcs

━━━━━━━━━━━━━━━━

📊 *SUMMARY*
Total Stores: 1
Total Low Stock Products: 1

🔔 *ACTION REQUIRED*
Please review the stock levels and arrange replenishment for the above products.

*J I PERFUME*
_Automated Inventory Alert_`;
}

/**
 * Format an executive low-stock digest report for Cron Job WhatsApp delivery
 * Matches exact consolidated multi-store format requested:
 * ⚠️ *J I PERFUME – LOW STOCK ALERT*
 * Dear Team, Below is the consolidated low-stock report for all stores.
 * 🏬 *STORE: <NAME>*
 * 1. *<Product>* SKU: <SKU> | Stock: <Qty> Pcs | Minimum: <Min> Pcs
 * 📊 *SUMMARY* ... 🔔 *ACTION REQUIRED* ...
 * (No PDF attached).
 */
export function formatLowStockDigestMessage({ storeGroups, totalItems, threshold = 10 }) {
  let body = `⚠️ *J I PERFUME – LOW STOCK ALERT*\n\n`;
  body += `Dear Team,\n\n`;
  body += `Below is the consolidated low-stock report for all stores.\n\n`;

  for (const group of storeGroups) {
    const sName = group.cityName
      ? (group.storeName.toUpperCase().includes(group.cityName.toUpperCase())
          ? group.storeName.toUpperCase()
          : `${group.cityName.toUpperCase()} – ${group.storeName.toUpperCase()}`)
      : group.storeName.toUpperCase();

    body += `━━━━━━━━━━━━━━━━\n`;
    body += `🏬 *STORE: ${sName}*\n\n`;

    group.items.forEach((item, index) => {
      const minLevel = item.reorderLevel || threshold || 10;
      body += `${index + 1}. *${item.productName}*\n`;
      body += `   SKU: ${item.sku} | Stock: ${item.quantity} Pcs | Minimum: ${minLevel} Pcs\n\n`;
    });
  }

  body += `━━━━━━━━━━━━━━━━\n\n`;
  body += `📊 *SUMMARY*\n`;
  body += `Total Stores: ${storeGroups.length}\n`;
  body += `Total Low Stock Products: ${totalItems}\n\n`;
  body += `🔔 *ACTION REQUIRED*\n`;
  body += `Please review the stock levels and arrange replenishment for the above products.\n\n`;
  body += `*J I PERFUME*\n`;
  body += `_Automated Inventory Alert_`;

  return body;
}

/**
 * Send an arbitrary text message to a single WhatsApp recipient
 * Uses approved Meta utility template (booking_12) as primary delivery to guarantee
 * delivery directly to recipient phones without 24-hr session blocking, plus text payload.
 * Supports displaying all multiple products across template parameter slots.
 */
export async function sendWhatsAppTextMessage(phone, messageText, options = {}) {
  const sanitized = sanitizeIndianPhone(phone);
  if (!sanitized || sanitized.length !== 10) {
    return {
      success: false,
      phone,
      message: `Invalid 10-digit Indian mobile number: "${phone}"`,
    };
  }

  const apiUrl = process.env.WHATSAPP_API || 'https://crmapi.1automations.com/api/meta';
  const apiVersion = process.env.API_VERSION || 'v19.0';
  const phoneNumberId = process.env.PHONE_NUMBER_ID || '1267319776475923';
  const accessToken = process.env.ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API;

  const directUrl = `https://api.whatsapp.com/send?phone=91${sanitized}&text=${encodeURIComponent(messageText)}`;

  if (!accessToken && !apiUrl) {
    const msg = 'WhatsApp API credentials not configured in backend/.env';
    console.warn(`[WhatsApp Text Skipped] ${msg} for +91 ${sanitized}`);
    return { success: false, phone: sanitized, message: msg, directUrl };
  }

  const isMetaApi = apiUrl.includes('1automations.com') || apiUrl.includes('facebook.com') || apiUrl.includes('/meta');

  if (isMetaApi && phoneNumberId && accessToken) {
    try {
      const cleanBaseUrl = apiUrl.replace(/\/+$/, '');
      const metaEndpoint = cleanBaseUrl.endsWith('/messages')
        ? cleanBaseUrl
        : `${cleanBaseUrl}/${apiVersion}/${phoneNumberId}/messages`;

      let templateSuccess = false;
      let templateData = null;

      // 1. Upload & Send PDF Document in Table Form if provided
      let pdfMediaId = options.pdfMediaId || null;
      let docSent = false;
      let docData = null;
      if (!pdfMediaId && options.pdfBuffer) {
        try {
          const mediaEndpoint = cleanBaseUrl.endsWith('/messages')
            ? cleanBaseUrl.replace(/\/messages$/, '/media')
            : `${cleanBaseUrl}/${apiVersion}/${phoneNumberId}/media`;

          const formData = new FormData();
          formData.append(
            'file',
            new Blob([options.pdfBuffer], { type: 'application/pdf' }),
            options.pdfFilename || 'JI-Perfume-Low-Stock-Report.pdf'
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
            pdfMediaId = uploadData.id;
            console.log(`\x1b[32m[WhatsApp] Low Stock PDF uploaded to Meta Media. ID: ${pdfMediaId}\x1b[0m`);
          } else {
            console.warn('[WhatsApp] Low Stock PDF upload warning:', uploadData);
          }
        } catch (uploadErr) {
          console.warn('[WhatsApp] Low Stock PDF upload error:', uploadErr.message);
        }
      }

      // 1. Primary: Dispatch official Low Stock PDF report via Document Template (booking11)
      // This is the active approved template in WABA that reliably delivers the attached PDF report.
      if (pdfMediaId) {
        try {
          const docTemplateName = process.env.WHATSAPP_DOC_TEMPLATE || 'booking11';
          const docTemplateLang = process.env.WHATSAPP_DOC_LANG || 'en';

          const primaryItem = options.items?.[0];
          const rawStore = (primaryItem?.storeName || 'Main Boutique').trim();
          const pName = (primaryItem?.productName || 'Fragrance').trim();

          const totalStockCount = (options.items || []).reduce(
            (sum, it) => sum + Number(it.quantity || 0),
            0
          );
          const itemSummary = options.items && options.items.length === 1
            ? `${pName} (${rawStore}) | Stock: ${primaryItem.quantity} Pcs`
            : `${options.items.length} Fragrances | Total Stock: ${totalStockCount} Pcs`;

          // Valuation amount or '0'
          const totalValuation = (options.items || []).reduce(
            (sum, it) => sum + (Number(it.sellingPrice || it.purchaseCost || 0) * Number(it.quantity || 0)),
            0
          );
          const amountValue = totalValuation > 0 ? totalValuation.toFixed(2) : '0';

          const docTmplPayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: `91${sanitized}`,
            type: 'template',
            template: {
              name: docTemplateName,
              language: { code: docTemplateLang },
              components: [
                {
                  type: 'header',
                  parameters: [
                    {
                      type: 'document',
                      document: {
                        id: pdfMediaId,
                        filename: options.pdfFilename || 'JI-Perfume-Low-Stock-Report.pdf',
                      },
                    },
                  ],
                },
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: 'Admin Team' },
                    { type: 'text', text: 'LOW-STOCK-ALERT' },
                    { type: 'text', text: itemSummary },
                    { type: 'text', text: amountValue },
                  ],
                },
              ],
            },
          };

          const docTmplRes = await fetch(metaEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(docTmplPayload),
          });
          const docTmplData = await docTmplRes.json().catch(() => null);
          if (docTmplRes.ok && (docTmplData?.messaging_channel === 'whatsapp' || docTmplData?.message?.message_status === 'queued' || docTmplData?.messages)) {
            console.log(`\x1b[32m[WhatsApp Template Sent] Successfully dispatched Low Stock PDF report via booking11 to +91 ${sanitized}\x1b[0m`);
            return {
              success: true,
              phone: sanitized,
              docSent: true,
              pdfMediaId,
              data: docTmplData,
              directUrl,
            };
          } else {
            console.warn('[WhatsApp Document Template Warning]:', docTmplData);
          }
        } catch (docTmplErr) {
          console.warn('[WhatsApp Document Template Error]:', docTmplErr.message);
        }
      }

      // If no PDF was provided, fallback to standard text message payload
      const textPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: `91${sanitized}`,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText,
        },
      };

      const res = await fetch(metaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(textPayload),
      });

      const data = await res.json().catch(() => null);
      const isSuccess =
        docSent ||
        templateSuccess ||
        (res.ok &&
          (data?.messaging_channel === 'whatsapp' ||
            data?.messages ||
            data?.message?.message_status === 'queued' ||
            data?.success !== false));

      if (isSuccess) {
        console.log(`\x1b[32m[WhatsApp Delivered] Successfully queued for +91 ${sanitized}\x1b[0m`);
        return { success: true, phone: sanitized, docSent, pdfMediaId, data: docData || templateData || data, directUrl };
      } else {
        const errMsg = data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || data?.message || `Gateway status ${res.status}`;
        console.warn(`\x1b[33m[WhatsApp Text Gateway Error] to +91 ${sanitized}: ${errMsg}\x1b[0m`);
        return { success: false, phone: sanitized, error: errMsg, data, directUrl };
      }
    } catch (netErr) {
      console.error(`[WhatsApp Text Network Error] to +91 ${sanitized}:`, netErr.message);
      return { success: false, phone: sanitized, error: netErr.message, directUrl };
    }
  } else {
    // Fast2SMS or other gateway fallback
    try {
      const apiKey = accessToken || apiUrl;
      const res = await fetch('https://www.fast2sms.com/dev/whatsapp', {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          numbers: sanitized,
          message: messageText,
        }),
      });
      const resData = await res.json().catch(() => null);
      const isSuccess = res.ok && (resData?.status === true || resData?.return === true);
      return { success: isSuccess, phone: sanitized, data: resData, directUrl };
    } catch (netErr) {
      return { success: false, phone: sanitized, error: netErr.message, directUrl };
    }
  }
}

/**
 * Dispatch low-stock alert WhatsApp notification to configured phone numbers
 */
export async function sendLowStockAlert({ product, store, currentQuantity, threshold }) {
  const effectiveThreshold = Number(threshold ?? product?.reorderLevel ?? process.env.LOW_STOCK_THRESHOLD ?? 10);
  const qty = Number(currentQuantity);

  if (qty > effectiveThreshold) {
    return {
      success: false,
      skipped: true,
      reason: `Stock quantity (${qty}) is above threshold (${effectiveThreshold})`,
    };
  }

  const recipients = getLowStockAlertNumbers();
  if (!recipients.length) {
    console.warn('[Low Stock Alert Skipped] No alert phone numbers configured.');
    return { success: false, skipped: true, reason: 'No alert recipients configured' };
  }

  const message = formatLowStockAlertMessage({
    product,
    store,
    currentQuantity: qty,
    threshold: effectiveThreshold,
  });

  console.log(`\n\x1b[33m============================================================\x1b[0m`);
  console.log(`\x1b[33m⚠️  [LOW STOCK WHATSAPP ALERT DISPATCHING]\x1b[0m`);
  console.log(`\x1b[1m🌸 Product:\x1b[0m   ${product?.name || 'Perfume'} (SKU: ${product?.sku || 'N/A'})`);
  console.log(`\x1b[1m📍 Outlet:\x1b[0m    ${store?.name || 'Store'} (${store?.city?.name || store?.city || 'Mandvi'})`);
  console.log(`\x1b[1m📦 Stock:\x1b[0m     ${qty} units (Threshold: <= ${effectiveThreshold})`);
  console.log(`\x1b[1m📱 Numbers:\x1b[0m   ${recipients.map((n) => `+91 ${n}`).join(', ')}`);
  console.log(`\x1b[33m============================================================\x1b[0m\n`);

  const results = await Promise.allSettled(
    recipients.map((phone) => sendWhatsAppTextMessage(phone, message))
  );

  const summary = results.map((r, i) => ({
    phone: recipients[i],
    status: r.status,
    result: r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message },
  }));

  const anySuccess = summary.some((s) => s.result?.success);

  return {
    success: anySuccess,
    product: { id: product?.id, name: product?.name, sku: product?.sku },
    store: store ? { id: store.id, name: store.name } : null,
    currentQuantity: qty,
    threshold: effectiveThreshold,
    recipients: summary,
  };
}

/**
 * Check multiple items and dispatch low-stock alerts for any item <= threshold
 */
export async function checkAndSendLowStockAlerts(items) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const results = [];
  for (const item of items) {
    try {
      const res = await sendLowStockAlert(item);
      results.push(res);
    } catch (err) {
      console.warn(`[LowStockAlert Item Error]:`, err.message);
      results.push({ success: false, error: err.message, item });
    }
  }
  return results;
}

/**
 * Send WhatsApp Invoice to customer
 * Uses WHATSAPP_API environment variable
 */
export async function sendWhatsAppInvoice(invoice) {
  try {
    const rawPhone = invoice.customer?.phone || invoice.customerPhone;
    const phone = sanitizeIndianPhone(rawPhone);

    if (!phone || phone.length !== 10) {
      const msg = 'Invalid phone number: Customer must have a valid 10-digit mobile number.';
      console.error(`\x1b[33m[WhatsApp Skipped] Invoice #${invoice.invoiceNumber}: ${msg} (Received: "${rawPhone}")\x1b[0m`);
      return {
        success: false,
        message: msg,
      };
    }

    const apiUrl = process.env.WHATSAPP_API || 'https://crmapi.1automations.com/api/meta';
    const apiVersion = process.env.API_VERSION || 'v19.0';
    const phoneNumberId = process.env.PHONE_NUMBER_ID || '1267319776475923';
    const accessToken = process.env.ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API;

    const message = formatInvoiceWhatsAppMessage(invoice);
    const directUrl = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodeURIComponent(message)}`;

    if (!accessToken && !apiUrl) {
      const msg = 'WhatsApp API credentials not configured in backend/.env';
      console.error(`\x1b[31m[WhatsApp Error] Invoice #${invoice.invoiceNumber}: ${msg}\x1b[0m`);
      return {
        success: false,
        message: msg,
        whatsappUrl: directUrl,
      };
    }

    console.log(`[WhatsApp] Auto-sending bill #${invoice.invoiceNumber} to +91 ${phone}...`);

    let apiSuccess = false;
    let apiMessage = '';

    // 1. Check if Meta WhatsApp Cloud API (1automations or graph.facebook.com) is configured
    const isMetaApi = apiUrl.includes('1automations.com') || apiUrl.includes('facebook.com') || apiUrl.includes('/meta');

    if (isMetaApi && phoneNumberId && accessToken) {
      try {
        const cleanBaseUrl = apiUrl.replace(/\/+$/, '');
        const metaEndpoint = cleanBaseUrl.endsWith('/messages')
          ? cleanBaseUrl
          : `${cleanBaseUrl}/${apiVersion}/${phoneNumberId}/messages`;

        console.log(`[WhatsApp] Dispatching via Meta Cloud API Gateway: ${metaEndpoint}`);

        const itemsSummary = (invoice.items || [])
          .map((i) => `${i.productName || i.product?.name || 'Perfume'} (${i.quantity}x)`)
          .join(', ')
          .slice(0, 60);

        // --- STEP 1: Generate & Upload Official A4 Tax Invoice PDF to Meta Media ---
        let pdfMediaId = null;
        let uploadData = null;
        try {
          const pdfBuffer = await generateInvoicePdfBuffer(invoice);
          // Save a permanent local copy to backend/invoices/
          try {
            await saveInvoicePdfLocally(invoice, pdfBuffer);
          } catch (localErr) {
            console.warn('[WhatsApp] Failed to save local PDF copy:', localErr.message);
          }
          const mediaEndpoint = cleanBaseUrl.endsWith('/messages')
            ? cleanBaseUrl.replace(/\/messages$/, '/media')
            : `${cleanBaseUrl}/${apiVersion}/${phoneNumberId}/media`;

          console.log(`[WhatsApp] Uploading generated PDF invoice (${pdfBuffer.length} bytes) to ${mediaEndpoint}...`);

          const formData = new FormData();
          formData.append(
            'file',
            new Blob([pdfBuffer], { type: 'application/pdf' }),
            `JJ-Perfume-Invoice-${invoice.invoiceNumber}.pdf`
          );
          formData.append('type', 'application/pdf');
          formData.append('messaging_product', 'whatsapp');

          const uploadRes = await fetch(mediaEndpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData,
          });

          uploadData = await uploadRes.json().catch(() => null);
          if (uploadRes.ok && uploadData?.id) {
            pdfMediaId = uploadData.id;
            console.log(`[WhatsApp] PDF invoice uploaded. Media ID: ${pdfMediaId}`);
          } else {
            console.warn('[WhatsApp] PDF upload response warning:', uploadData);
          }
        } catch (pdfErr) {
          console.warn('[WhatsApp] PDF generation or upload failed:', pdfErr.message);
        }

        // --- STEP 2: Send PDF Document Message with Proper Caption ---
        let docSent = false;
        let docData = null;
        if (pdfMediaId) {
          try {
            const customerName = invoice.customer?.name || 'Valued Customer';
            const paidStr = Number(invoice.paidAmount || invoice.grandTotal || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            });

            const docPayload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: `91${phone}`,
              type: 'document',
              document: {
                id: pdfMediaId,
                caption: `✨ *JJ PERFUME - OFFICIAL TAX INVOICE* ✨\n🧾 *Bill No:* ${invoice.invoiceNumber}\n👤 *Customer:* ${customerName}\n💰 *Amount Paid:* ₹${paidStr} (PAID IN FULL)\n📍 *Store:* ${invoice.store?.name || 'JJ Perfume'}, ${invoice.store?.city?.name || 'Mandvi'}\n\nThank you for choosing JJ Perfume! 🌸`,
                filename: `JJ-Perfume-Invoice-${invoice.invoiceNumber}.pdf`,
              },
            };

            const docResponse = await fetch(metaEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(docPayload),
            });

            docData = await docResponse.json().catch(() => null);
            if (docResponse.ok && (docData?.messaging_channel === 'whatsapp' || docData?.messages || docData?.message?.message_status === 'queued')) {
              docSent = true;
              console.log(`[WhatsApp] PDF Document dispatched successfully:`, docData);
            } else {
              console.warn(`[WhatsApp] Document send response:`, docData);
            }
          } catch (docErr) {
            console.warn('[WhatsApp] Error dispatching document:', docErr.message);
          }
        }

        // --- STEP 3: Send Approved Template (Bypasses 24-hr session restriction) ---
        // 3a. If a Document Template is configured or exists in Meta WABA, send document template
        const docTemplateName = process.env.WHATSAPP_DOC_TEMPLATE;
        if (docTemplateName && pdfMediaId) {
          try {
            const docTmplPayload = {
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: `91${phone}`,
              type: 'template',
              template: {
                name: docTemplateName,
                language: { code: process.env.WHATSAPP_DOC_LANG || 'en' },
                components: [
                  {
                    type: 'header',
                    parameters: [
                      {
                        type: 'document',
                        document: {
                          id: pdfMediaId,
                          filename: `JJ-Perfume-Invoice-${invoice.invoiceNumber}.pdf`,
                        },
                      },
                    ],
                  },
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: String(invoice.customer?.name || 'Valued Customer').slice(0, 30) },
                      { type: 'text', text: String(invoice.invoiceNumber || 'INV-001') },
                      { type: 'text', text: String(itemsSummary || 'Luxury Fragrances').slice(0, 60) },
                      { type: 'text', text: String(Number(invoice.grandTotal || 0).toFixed(2)) },
                    ],
                  },
                ],
              },
            };

            const docTmplRes = await fetch(metaEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
              },
              body: JSON.stringify(docTmplPayload),
            });
            const docTmplData = await docTmplRes.json().catch(() => null);
            if (docTmplRes.ok && (docTmplData?.messaging_channel === 'whatsapp' || docTmplData?.message?.message_status === 'queued' || docTmplData?.messages)) {
              docSent = true;
              console.log('[WhatsApp] Official Document Template (booking11) dispatched with PDF:', docTmplData);
            } else {
              console.warn('[WhatsApp] Document Template send warning:', docTmplData);
            }
          } catch (docTmplErr) {
            console.warn('[WhatsApp] Document Template send error:', docTmplErr.message);
          }
        }

        // 3b. Fallback: Send approved payment receipt template if document template was not sent
        let templateResponse = { ok: false };
        let templateData = null;
        if (!docSent) {
          const templatePayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: `91${phone}`,
            type: 'template',
            template: {
              name: 'ji_payment_received_clone_km',
              language: { code: 'da' },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: String(invoice.customer?.name || 'Valued Customer').slice(0, 30) },
                    { type: 'text', text: String(Number(invoice.paidAmount || invoice.grandTotal || 0).toFixed(2)) },
                    { type: 'text', text: String(invoice.invoiceNumber || 'INV-001') },
                    { type: 'text', text: itemsSummary || 'Luxury Perfumes' },
                    { type: 'text', text: `₹${Number(invoice.grandTotal || 0).toFixed(2)}` },
                  ],
                },
              ],
            },
          };

          templateResponse = await fetch(metaEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(templatePayload),
          });

          templateData = await templateResponse.json().catch(() => null);
        }

        // --- STEP 4: Also Send Complete Text Breakdown with PDF Download Link ---
        const textPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: `91${phone}`,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        };

        const textResponse = await fetch(metaEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(textPayload),
        });

        const textData = await textResponse.json().catch(() => null);

        const isSuccess =
          docSent ||
          (templateResponse.ok && (templateData?.messaging_channel === 'whatsapp' || templateData?.messages || templateData?.message?.message_status === 'queued' || templateData?.success !== false)) ||
          (textResponse.ok && (textData?.messaging_channel === 'whatsapp' || textData?.messages || textData?.message?.message_status === 'queued' || textData?.success !== false));

        if (isSuccess) {
          apiSuccess = true;
          apiMessage = 'Bill PDF & message dispatched successfully!';
          console.log(`\n\x1b[32m============================================================\x1b[0m`);
          console.log(`\x1b[32m✅ [WHATSAPP DISPATCH SUCCESS]\x1b[0m`);
          console.log(`\x1b[32m🧾 Bill No: #${invoice.invoiceNumber}\x1b[0m`);
          console.log(`\x1b[32m📱 Recipient: +91 ${phone} (${invoice.customer?.name || 'Customer'})\x1b[0m`);
          console.log(`\x1b[32m============================================================\x1b[0m\n`);
        } else {
          const parseError = (d) => !d ? null : (typeof d.error === 'string' ? d.error : (d.error?.message || (typeof d.message === 'string' ? d.message : null)));
          const rawErr = parseError(uploadData) || parseError(docData) || parseError(templateData) || parseError(textData);

          if (!rawErr) {
            apiMessage = 'WhatsApp gateway rejected request (Check API limits or template)';
          } else if (/token invalidated|unauthorized|expired|invalid token/i.test(rawErr)) {
            apiMessage = 'WhatsApp API Token Invalid or Expired: Please update ACCESS_TOKEN in backend/.env';
          } else if (/template/i.test(rawErr)) {
            apiMessage = `WhatsApp Template Error: ${rawErr}`;
          } else if (/phone|recipient|number/i.test(rawErr)) {
            apiMessage = `WhatsApp Phone Error: ${rawErr}`;
          } else {
            apiMessage = `WhatsApp API Error: ${rawErr}`;
          }

          // Output formatted high-visibility error block to backend terminal
          console.error(`\n\x1b[41m\x1b[37m ❌ WHATSAPP DELIVERY ERROR \x1b[0m`);
          console.error(`\x1b[31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
          console.error(`\x1b[1m\x1b[33m🧾 Bill Number:\x1b[0m      #${invoice.invoiceNumber}`);
          console.error(`\x1b[1m\x1b[33m📱 Recipient Phone:\x1b[0m  +91 ${phone} (${invoice.customer?.name || 'Customer'})`);
          console.error(`\x1b[1m\x1b[31m⚠️ Error Reason:\x1b[0m     ${apiMessage}`);
          console.error(`\x1b[1m\x1b[36m🌐 Gateway URL:\x1b[0m      ${metaEndpoint}`);
          if (uploadData) console.error(`\x1b[35m📦 PDF Upload Detail:\x1b[0m`, JSON.stringify(uploadData));
          if (docData) console.error(`\x1b[35m📦 Document Detail:\x1b[0m  `, JSON.stringify(docData));
          if (templateData) console.error(`\x1b[35m📦 Template Detail:\x1b[0m  `, JSON.stringify(templateData));
          if (textData) console.error(`\x1b[35m📦 Text Msg Detail:\x1b[0m  `, JSON.stringify(textData));
          console.error(`\x1b[31m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n`);
        }
      } catch (metaErr) {
        apiMessage = `WhatsApp Network Connection Error: ${metaErr.message}`;
        console.error(`\n\x1b[41m\x1b[37m ❌ WHATSAPP NETWORK CONNECTION ERROR \x1b[0m`);
        console.error(`\x1b[31mFailed to connect to ${apiUrl}: ${metaErr.message}\x1b[0m\n`);
      }
    } else {
      // 2. Fallback to Fast2SMS Gateway if using Fast2SMS key
      try {
        const apiKey = accessToken || apiUrl;
        const whatsappResponse = await fetch(`https://www.fast2sms.com/dev/whatsapp`, {
          method: 'POST',
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify({
            numbers: phone,
            message: message,
          }),
        });

        const resData = await whatsappResponse.json().catch(() => null);

        if (whatsappResponse.ok && (resData?.status === true || resData?.return === true)) {
          apiSuccess = true;
          apiMessage = resData?.message || 'WhatsApp message dispatched successfully';
        } else {
          const bulkResponse = await fetch(`https://www.fast2sms.com/dev/bulkV2`, {
            method: 'POST',
            headers: {
              'authorization': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              route: 'q',
              message: message,
              numbers: phone,
              language: 'english',
            }),
          });

          const bulkData = await bulkResponse.json().catch(() => null);

          if (bulkResponse.ok && (bulkData?.status === true || bulkData?.return === true)) {
            apiSuccess = true;
            apiMessage = bulkData?.message || 'Message sent successfully';
          } else {
            apiMessage = bulkData?.message || resData?.message || `Gateway error ${whatsappResponse.status}`;
          }
        }
      } catch (networkErr) {
        console.error('[WhatsApp] Gateway call failed:', networkErr.message);
        apiMessage = networkErr.message;
      }
    }

    return {
      success: apiSuccess,
      message: apiSuccess ? 'Bill sent to WhatsApp successfully' : apiMessage,
      phone: `+91 ${phone}`,
      invoiceNumber: invoice.invoiceNumber,
      whatsappUrl: directUrl,
    };
  } catch (err) {
    console.error('[WhatsApp Service Error]:', err);
    return {
      success: false,
      message: err.message,
    };
  }
}
