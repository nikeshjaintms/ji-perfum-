import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local folder for saved invoice PDFs: backend/invoices
export const INVOICES_DIR = path.resolve(__dirname, '../../invoices');

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
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Tax Invoice - ${invoice.invoiceNumber}`,
          Author: 'JJ Perfume ERP',
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

      const storeName = store.name || 'JJ PERFUME';
      const storeAddress = store.address || 'Heritage Bazar, Near Main Gate, Mandvi - 370465, Kutch, Gujarat';
      const storePhone = store.phone || '+91 98765 43210';
      const storeGstin = store.gstin || '24AABCJ1234F1Z5';
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

      // --- BRAND HEADER ---
      doc
        .rect(36, 36, 523, 70)
        .fill('#1e1b18');

      doc
        .fillColor('#f59e0b')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('J J   P E R F U M E', 50, 48, { characterSpacing: 2 });

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

      // Left Box: Terms & Notes
      doc
        .rect(36, y, 280, 110)
        .lineWidth(0.5)
        .strokeColor('#e2e8f0')
        .stroke();

      doc
        .fillColor('#0f172a')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('TERMS & CONDITIONS:', 46, y + 8)
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748b')
        .text('1. Goods once sold will not be returned or exchanged.', 46, y + 22)
        .text('2. Please store luxury perfumes away from direct sunlight & heat.', 46, y + 33)
        .text('3. Authentic luxury perfumery, bottled with care.', 46, y + 44)
        .text(`4. ${jurisdiction}`, 46, y + 55)
        .fillColor('#065f46')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(`✓ Paid Amount: ₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 46, y + 74);

      // --- SIGNATURE FOOTER ---
      y += 125;
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

