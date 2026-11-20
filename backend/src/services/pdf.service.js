import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local folder for saved invoice PDFs: backend/invoices
export const INVOICES_DIR = path.resolve(__dirname, '../../invoices');
// Local folder for saved inventory reports: backend/reports
export const REPORTS_DIR = path.resolve(__dirname, '../../reports');

/**
 * Convert numerical monetary amount into Indian English words
 * @param {number|string} amount 
 * @returns {string} e.g. "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paise Only"
 */
export function numberToWords(amount) {
  const num = Number(amount);
  if (isNaN(num) || num === 0) return 'Rupees Zero Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return (tens[t] + (o ? ' ' + ones[o] : '')).trim();
  }

  function convertThreeDigits(n) {
    const h = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (h > 0) {
      res += ones[h] + ' Hundred';
      if (rest > 0) res += ' ';
    }
    if (rest > 0) {
      res += convertTwoDigits(rest);
    }
    return res.trim();
  }

  const [rupeesPart, paisePart] = num.toFixed(2).split('.');
  let rupees = parseInt(rupeesPart, 10);
  const paise = parseInt(paisePart, 10);

  let words = '';
  if (rupees > 0) {
    const crore = Math.floor(rupees / 10000000);
    rupees %= 10000000;
    const lakh = Math.floor(rupees / 100000);
    rupees %= 100000;
    const thousand = Math.floor(rupees / 1000);
    rupees %= 1000;
    const hundreds = rupees;

    const parts = [];
    if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');
    if (lakh > 0) parts.push(convertTwoDigits(lakh) + ' Lakh');
    if (thousand > 0) parts.push(convertTwoDigits(thousand) + ' Thousand');
    if (hundreds > 0) parts.push(convertThreeDigits(hundreds));

    words = 'Rupees ' + parts.join(' ');
  } else {
    words = 'Rupees Zero';
  }

  if (paise > 0) {
    words += ' and ' + convertTwoDigits(paise) + ' Paise';
  }

  return words.trim() + ' Only';
}

/**
 * Save invoice PDF buffer to local storage disk (backend/invoices/)
 * @param {Object} invoice Invoice data
 * @param {Buffer} [pdfBuffer] Optional pre-generated PDF binary buffer
 * @returns {Promise<{ filePath: string, filename: string, relativeUrl: string }>}
 */
export async function saveInvoicePdfLocally(invoice, pdfBuffer) {
  try {
    if (!fs.existsSync(INVOICES_DIR)) {
      fs.mkdirSync(INVOICES_DIR, { recursive: true });
    }

    const safeNumber = String(invoice.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `JJ-Perfume-Invoice-${safeNumber}.pdf`;
    const filePath = path.join(INVOICES_DIR, filename);

    // If buffer was not passed, generate it
    const buffer = pdfBuffer || (await generateInvoicePdfBuffer(invoice));

    await fs.promises.writeFile(filePath, buffer);
    console.log(`[PDF Service] Saved invoice PDF locally to: ${filePath} (${buffer.length} bytes)`);

    return {
      filePath,
      filename,
      relativeUrl: `/invoices/${filename}`,
    };
  } catch (err) {
    console.error('[PDF Service] Error saving PDF locally:', err);
    throw err;
  }
}

/**
 * Generate a luxury A4 Tax Invoice PDF buffer for JJ Perfume
 * @param {Object} invoice Invoice object with customer, store, items, payments
 * @returns {Promise<Buffer>}
 */
export function generateInvoicePdfBuffer(invoice) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Tax Invoice - ${invoice.invoiceNumber}`,
          Author: 'J I Perfume ERP',
          Subject: 'Tax Invoice & Receipt',
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      const store = invoice.store || {};
      const city = store.city || {};
      const customer = invoice.customer || {};

      const storeName = store.name || 'J I PERFUME';
      const storeAddress = store.address || 'Heritage Bazar, Near Main Gate, Mandvi - 370465, Kutch, Gujarat';
      const storePhone = store.phone || '+91 98765 43210';
      const storeGstin = store.gstin || '24AABCJ1234F1Z5';
      const storeUpi = store.upiId || process.env.STORE_UPI_ID || 'jjperfumes@icici';
      const cityName = city.name || 'Mandvi';
      const stateName = city.state || 'Gujarat';
      const stateCode = city.stateCode || '24';
      const jurisdiction = city.jurisdictionText || `Subject to ${cityName} Jurisdiction.`;

      const dateObj = invoice.createdAt ? new Date(invoice.createdAt) : new Date();
      const dateStr = dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      // Pre-generate UPI QR code buffer for embedding
      let qrImageBuffer = null;
      try {
        const upiString = `upi://pay?pa=${storeUpi}&pn=${encodeURIComponent(storeName)}&am=${Number(invoice.grandTotal || 0)}&cu=INR&tn=${encodeURIComponent('Bill ' + invoice.invoiceNumber)}`;
        qrImageBuffer = await QRCode.toBuffer(upiString, {
          width: 160,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
      } catch (qrErr) {
        console.warn('[PDF Service] QR code buffer generation failed:', qrErr.message);
      }

      // --- BRAND HEADER ---
      doc
        .rect(36, 36, 523, 70)
        .fill('#1e1b18');

      doc
        .fillColor('#f59e0b')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('J I   P E R F U M E', 50, 48, { characterSpacing: 2 });

      doc
        .fillColor('#e2e8f0')
        .fontSize(8)
        .font('Helvetica')
        .text('HAUTE PARFUMERIE · LUXURY FRAGRANCE HOUSE', 52, 72, { characterSpacing: 1 });

      doc
        .fillColor('#ffffff')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 400, 52, { align: 'right' });

      doc
        .fillColor('#cbd5e1')
        .fontSize(8)
        .font('Helvetica')
        .text(`Original for Recipient`, 400, 72, { align: 'right' });

      // --- STORE & INVOICE DETAILS METADATA ---
      let y = 118;

      // Store Details Box (Left)
      doc
        .rect(36, y, 255, 95)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      doc
        .rect(36, y, 255, 18)
        .fill('#f8fafc');

      doc
        .fillColor('#334155')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('OUTLET / STORE DETAILS', 44, y + 5);

      doc
        .fillColor('#0f172a')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(storeName, 44, y + 24)
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#475569')
        .text(storeAddress, 44, y + 37, { width: 235 })
        .text(`Phone: ${storePhone} · GSTIN: ${storeGstin}`, 44, y + 68)
        .text(`State: ${stateName} (Code: ${stateCode})`, 44, y + 80);

      // Invoice Details Box (Right)
      doc
        .rect(298, y, 261, 95)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      doc
        .rect(298, y, 261, 18)
        .fill('#f8fafc');

      doc
        .fillColor('#334155')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('INVOICE & PAYMENT DETAILS', 306, y + 5);

      doc
        .fillColor('#0f172a')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`Invoice No: ${invoice.invoiceNumber}`, 306, y + 24)
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#475569')
        .text(`Date & Time: ${dateStr} at ${timeStr}`, 306, y + 37)
        .text(`Payment Mode: ${invoice.paymentMethod || 'UPI / Cash'}`, 306, y + 50)
        .text(`Payment Status: ${invoice.paymentStatus === 'PAID' ? 'PAID IN FULL' : 'PARTIALLY PAID'}`, 306, y + 63);

      if (invoice.paymentStatus === 'PAID') {
        doc.rect(480, y + 60, 65, 16).fill('#ecfdf5');
        doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(7.5).text('PAID', 480, y + 64, { width: 65, align: 'center' });
      }

      // Customer Details (Banner)
      y = 222;
      doc
        .rect(36, y, 523, 40)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      doc
        .fillColor('#64748b')
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('BILLED TO (CUSTOMER):', 44, y + 8);

      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(customer.name || 'Valued Guest', 44, y + 20)
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#334155')
        .text(`Phone: +91 ${customer.phone || 'N/A'}${customer.city ? ` · City: ${customer.city}` : ''}`, 200, y + 21);

      // --- ITEMS TABLE ---
      y = 272;

      // Table Header
      doc.rect(36, y, 523, 20).fill('#0f172a');

      doc
        .fillColor('#ffffff')
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('#', 42, y + 6)
        .text('ITEM DESCRIPTION', 65, y + 6)
        .text('VOL', 260, y + 6)
        .text('QTY', 300, y + 6, { width: 30, align: 'right' })
        .text('RATE (₹)', 340, y + 6, { width: 60, align: 'right' })
        .text('TAX (18%)', 410, y + 6, { width: 60, align: 'right' })
        .text('AMOUNT (₹)', 480, y + 6, { width: 70, align: 'right' });

      y += 20;

      const items = invoice.items || [];
      items.forEach((item, index) => {
        const pName = item.productName || item.product?.name || 'Perfume';
        const vol = item.volumeMl || item.product?.volumeMl ? `${item.volumeMl || item.product?.volumeMl}ml` : '-';
        const qty = item.quantity || 1;
        const rate = Number(item.unitPrice || 0);
        const lineTotal = Number(item.totalAmount || (rate * qty));
        const taxVal = Number((lineTotal * 0.18).toFixed(2));

        const isEven = index % 2 === 0;
        doc.rect(36, y, 523, 22).fill(isEven ? '#ffffff' : '#f8fafc');

        doc
          .fillColor('#334155')
          .fontSize(8)
          .font('Helvetica')
          .text(String(index + 1), 42, y + 7)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(pName, 65, y + 7, { width: 190, lineBreak: false })
          .font('Helvetica')
          .fillColor('#475569')
          .text(vol, 260, y + 7)
          .text(String(qty), 300, y + 7, { width: 30, align: 'right' })
          .text(rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 340, y + 7, { width: 60, align: 'right' })
          .text(taxVal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 410, y + 7, { width: 60, align: 'right' })
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 480, y + 7, { width: 70, align: 'right' });

        doc.rect(36, y + 22, 523, 0.5).fill('#e2e8f0');
        y += 22;
      });

      // --- SUMMARY & TOTALS ---
      y += 10;
      const subtotal = Number(invoice.subtotal || 0);
      const discount = Number(invoice.discountAmount || 0);
      const taxAmount = Number(invoice.taxAmount || 0);
      const grandTotal = Number(invoice.grandTotal || 0);
      const paidAmount = Number(invoice.paidAmount || grandTotal);

      const totalsBoxX = 330;
      const totalsBoxW = 229;

      doc
        .rect(totalsBoxX, y, totalsBoxW, 110)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      let ty = y + 8;
      const printRow = (label, val, isBold = false, color = '#334155') => {
        doc
          .fillColor(color)
          .fontSize(isBold ? 9 : 8)
          .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .text(label, totalsBoxX + 10, ty)
          .text(val, totalsBoxX + 110, ty, { width: 105, align: 'right' });
        ty += 16;
      };

      printRow('Subtotal', `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      if (discount > 0) {
        printRow('Discount', `- ₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, false, '#b45309');
      }
      printRow('CGST (9%)', `₹${(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      printRow('SGST (9%)', `₹${(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

      doc.rect(totalsBoxX, ty - 4, totalsBoxW, 26).fill('#0f172a');
      doc
        .fillColor('#f59e0b')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('GRAND TOTAL', totalsBoxX + 10, ty + 2)
        .text(`₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsBoxX + 110, ty + 2, { width: 105, align: 'right' });

      // Left Box: Terms & Notes + Dynamic UPI QR
      doc
        .rect(36, y, 280, 110)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      const termsWidth = qrImageBuffer ? 185 : 260;

      doc
        .fillColor('#0f172a')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('TERMS & CONDITIONS:', 46, y + 8)
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text('1. Goods once sold will not be returned or exchanged.', 46, y + 22, { width: termsWidth })
        .text('2. Store luxury perfumes away from direct sunlight.', 46, y + 33, { width: termsWidth })
        .text('3. Authentic luxury perfumery, bottled with care.', 46, y + 44, { width: termsWidth })
        .text(`4. ${jurisdiction}`, 46, y + 55, { width: termsWidth })
        .fillColor('#065f46')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(`✓ Paid: ₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 46, y + 74, { width: termsWidth });

      if (qrImageBuffer) {
        try {
          doc.image(qrImageBuffer, 235, y + 10, { width: 70, height: 70 });
          doc
            .fillColor('#64748b')
            .fontSize(6)
            .font('Helvetica-Bold')
            .text('SCAN TO PAY (UPI)', 235, y + 84, { width: 70, align: 'center' });
        } catch (imgErr) {
          console.warn('[PDF Service] Error drawing QR on PDF:', imgErr.message);
        }
      }

      // --- AMOUNT IN WORDS SECTION ---
      const words = numberToWords(grandTotal);
      doc
        .rect(36, y + 115, 523, 20)
        .fill('#f8fafc');

      doc
        .rect(36, y + 115, 523, 20)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      doc
        .fillColor('#0f172a')
        .fontSize(7.5)
        .font('Helvetica-Bold')
        .text('AMOUNT IN WORDS: ', 44, y + 121, { continued: true })
        .font('Helvetica')
        .fillColor('#334155')
        .text(words);

      // --- SIGNATURE FOOTER ---
      y += 145;
      doc
        .fillColor('#94a3b8')
        .fontSize(7)
        .font('Helvetica')
        .text('This is a computer-generated tax invoice and does not require a physical signature.', 36, y, { align: 'center', width: 523 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Save low-stock report PDF buffer locally to backend/reports/
 * @param {Buffer} pdfBuffer
 * @param {string} [customFilename]
 * @returns {Promise<{ filePath: string, filename: string, relativeUrl: string }>}
 */
export async function saveLowStockPdfLocally(pdfBuffer, customFilename) {
  try {
    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = customFilename || `JI-Perfume-Low-Stock-Report-${timestamp}.pdf`;
    const filePath = path.join(REPORTS_DIR, filename);

    await fs.promises.writeFile(filePath, pdfBuffer);
    console.log(`[PDF Service] Saved low stock PDF report locally to: ${filePath} (${pdfBuffer.length} bytes)`);

    return {
      filePath,
      filename,
      relativeUrl: `/reports/${filename}`,
    };
  } catch (err) {
    console.error('[PDF Service] Error saving low stock PDF locally:', err);
    throw err;
  }
}

/**
 * Generate luxury A4 Low Stock Inventory Report PDF buffer in grouped table form
 * Table format:
 * Sr No | Store Outlet | Product Name | SKU | Volume | Quantity | Min Level | Status
 * Multiple products under the same store are grouped cleanly with proper spacing.
 *
 * @param {Object} options
 * @param {Array} options.storeGroups
 * @param {number} options.totalItems
 * @param {number} options.threshold
 * @param {Date|string} [options.generatedAt]
 * @returns {Promise<Buffer>}
 */
export function generateLowStockPdfBuffer({ storeGroups = [], totalItems = 0, threshold = 10, generatedAt = new Date() }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
        info: {
          Title: 'J I Perfume - Low Stock Inventory Report',
          Author: 'J I Perfume ERP',
          Subject: 'Consolidated Low Stock Inventory Audit Report',
        },
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const dateObj = generatedAt instanceof Date ? generatedAt : new Date(generatedAt || Date.now());
      const dateStr = dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      // Count out of stock items
      let criticalCount = 0;
      for (const group of storeGroups) {
        for (const item of (group.items || [])) {
          if (Number(item.quantity) === 0) criticalCount++;
        }
      }

      function drawPageHeader() {
        // Gold top accent line
        doc.rect(30, 30, 535, 3).fill('#f59e0b');
        // Charcoal brand banner
        doc.rect(30, 33, 535, 58).fill('#1e1b18');

        doc
          .fillColor('#f59e0b')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('J I   P E R F U M E', 45, 43, { characterSpacing: 2 });

        doc
          .fillColor('#cbd5e1')
          .fontSize(7.5)
          .font('Helvetica')
          .text('HAUTE PARFUMERIE · LUXURY INVENTORY CONTROL', 47, 65, { characterSpacing: 1 });

        doc
          .fillColor('#ffffff')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('LOW STOCK REPORT', 380, 45, { align: 'right' });

        doc
          .fillColor('#94a3b8')
          .fontSize(7.5)
          .font('Helvetica')
          .text(`Generated: ${dateStr} at ${timeStr}`, 380, 64, { align: 'right' });
      }

      function drawSummaryCards(y) {
        const cards = [
          { label: 'AFFECTED STORES', val: `${storeGroups.length} Outlets`, color: '#0f172a' },
          { label: 'TOTAL LOW ITEMS', val: `${totalItems} Products`, color: '#0f172a' },
          { label: 'OUT OF STOCK (0 QTY)', val: `${criticalCount} Critical`, color: criticalCount > 0 ? '#dc2626' : '#16a34a' },
          { label: 'ALERT THRESHOLD', val: `<= ${threshold} Units`, color: '#d97706' },
        ];
        const cardW = 125;
        cards.forEach((c, idx) => {
          const cx = 30 + idx * (cardW + 11.6);
          doc.rect(cx, y, cardW, 38).fill('#f8fafc');
          doc.rect(cx, y, cardW, 38).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
          doc.fillColor('#64748b').fontSize(6.5).font('Helvetica-Bold').text(c.label, cx + 8, y + 7);
          doc.fillColor(c.color).fontSize(11).font('Helvetica-Bold').text(c.val, cx + 8, y + 19);
        });
        return y + 46;
      }

      function drawTableHeader(y) {
        doc.rect(30, y, 535, 20).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(7).font('Helvetica-Bold');
        doc.text('SR.', 32, y + 6, { width: 24, align: 'center' });
        doc.text('STORE OUTLET', 60, y + 6, { width: 110, align: 'left' });
        doc.text('PRODUCT NAME', 175, y + 6, { width: 140, align: 'left' });
        doc.text('SKU', 318, y + 6, { width: 68, align: 'left' });
        doc.text('VOL', 390, y + 6, { width: 38, align: 'center' });
        doc.text('STOCK', 432, y + 6, { width: 40, align: 'right' });
        doc.text('MIN', 476, y + 6, { width: 38, align: 'right' });
        doc.text('STATUS', 518, y + 6, { width: 44, align: 'center' });
        return y + 20;
      }

      // Draw initial page elements
      drawPageHeader();
      let curY = drawSummaryCards(100);
      curY = drawTableHeader(curY);

      let pageCount = 1;
      let itemCounter = 0;

      // Grouped store rows
      storeGroups.forEach((group, sIdx) => {
        const rawStore = (group.storeName || 'Main Boutique').trim();
        const rawCity = (group.cityName || '').trim();
        const sName = rawCity
          ? (rawStore.toUpperCase().includes(rawCity.toUpperCase())
              ? rawStore
              : `${rawStore} (${rawCity})`)
          : rawStore;

        (group.items || []).forEach((item, pIdx) => {
          itemCounter++;
          if (curY > 750) {
            // Footer on previous page
            doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text(`J I PERFUME ERP · Automated Inventory Audit Report · Page ${pageCount}`, 30, 785, { width: 535, align: 'center' });
            doc.addPage();
            pageCount++;
            // Compact continuation header
            doc.rect(30, 30, 535, 2).fill('#f59e0b');
            doc.rect(30, 32, 535, 22).fill('#1e1b18');
            doc.fillColor('#f59e0b').fontSize(9).font('Helvetica-Bold').text('J I PERFUME · LOW STOCK AUDIT REPORT (CONTINUED)', 40, 39);
            curY = drawTableHeader(60);
          }

          const rowH = 18;

          // Background tint alternating by store
          if (sIdx % 2 === 0) {
            doc.rect(30, curY, 535, rowH).fill('#ffffff');
          } else {
            doc.rect(30, curY, 535, rowH).fill('#fafafa');
          }

          // Sr No
          doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold').text(String(itemCounter), 32, curY + 5, { width: 24, align: 'center' });
          // Store Name
          doc.fillColor('#0f172a').fontSize(7.5).font('Helvetica-Bold').text(sName, 60, curY + 5, { width: 110, height: rowH, ellipsis: true });

          // Product Name
          doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold').text(item.productName || 'Fragrance', 175, curY + 5, { width: 140, ellipsis: true });
          // SKU
          doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(item.sku || 'N/A', 318, curY + 5, { width: 68, ellipsis: true });
          // Volume
          doc.fillColor('#475569').fontSize(7).font('Helvetica').text(item.volumeMl ? `${item.volumeMl}ml` : '-', 390, curY + 5, { width: 38, align: 'center' });
          // Stock
          const stockColor = Number(item.quantity) === 0 ? '#dc2626' : '#d97706';
          doc.fillColor(stockColor).fontSize(7.5).font('Helvetica-Bold').text(`${item.quantity} Pcs`, 432, curY + 5, { width: 40, align: 'right' });
          // Minimum Reorder Level
          doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(`${item.reorderLevel} Pcs`, 476, curY + 5, { width: 38, align: 'right' });
          // Status Pill Badge
          const isOos = Number(item.quantity) === 0;
          const badgeBg = isOos ? '#fee2e2' : '#fef3c7';
          const badgeTxt = isOos ? '#b91c1c' : '#b45309';
          const badgeLabel = isOos ? 'OOS' : 'LOW';
          doc.rect(524, curY + 4, 32, 10).fill(badgeBg);
          doc.fillColor(badgeTxt).fontSize(6).font('Helvetica-Bold').text(badgeLabel, 524, curY + 6, { width: 32, align: 'center' });

          // Subtle row bottom divider
          doc.rect(30, curY + rowH - 0.5, 535, 0.5).fill('#f1f5f9');
          curY += rowH;
        });

        // Store boundary separator line
        doc.rect(30, curY, 535, 1).fill('#cbd5e1');
        curY += 2;
      });

      // Bottom Action Required Box
      if (curY > 730) {
        doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text(`J I PERFUME ERP · Automated Inventory Audit Report · Page ${pageCount}`, 30, 785, { width: 535, align: 'center' });
        doc.addPage();
        pageCount++;
        curY = 40;
      }

      curY += 10;
      doc.rect(30, curY, 535, 26).fill('#fffbeb');
      doc.rect(30, curY, 535, 26).lineWidth(0.5).strokeColor('#fde68a').stroke();
      doc.fillColor('#b45309').fontSize(7.5).font('Helvetica-Bold').text('ACTION REQUIRED:', 40, curY + 8);
      doc.fillColor('#92400e').fontSize(7.5).font('Helvetica').text('Review stock levels and schedule replenishment for the boutique outlets listed above.', 130, curY + 8);

      // Page Footer
      doc.fillColor('#94a3b8').fontSize(6.5).font('Helvetica').text(`J I PERFUME ERP · Automated Inventory Audit Report · Page ${pageCount} · Strictly Confidential`, 30, 785, { width: 535, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

