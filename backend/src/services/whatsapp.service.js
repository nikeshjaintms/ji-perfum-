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
                      { type: 'text', text: `₹${Number(invoice.grandTotal || 0).toFixed(2)}` },
                      { type: 'text', text: itemsSummary || 'Luxury Perfumes' },
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
            if (docTmplRes.ok && !docTmplData?.error) {
              docSent = true;
              console.log('[WhatsApp] Document Template dispatched:', docTmplData);
            }
          } catch (docTmplErr) {
            console.warn('[WhatsApp] Document Template send error:', docTmplErr.message);
          }
        }

        // 3b. Send approved payment receipt template
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

        const templateResponse = await fetch(metaEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(templatePayload),
        });

        const templateData = await templateResponse.json().catch(() => null);

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
