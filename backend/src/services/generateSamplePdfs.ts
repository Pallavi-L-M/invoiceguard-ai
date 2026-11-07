import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

interface InvoiceData {
  fileName: string;
  invoiceNumber: string;
  vendor: string;
  vendorGSTIN: string;
  vendorAddress: string;
  date: string;
  dueDate: string;
  items: { description: string; qty: number; rate: number; amount: number }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

const sampleInvoices: InvoiceData[] = [
  {
    fileName: 'Case_1_ABC_Technologies_Duplicate_INV-1001.pdf',
    invoiceNumber: 'INV-1001',
    vendor: 'ABC Technologies Pvt Ltd',
    vendorGSTIN: '27AABCT1234F1Z5',
    vendorAddress: 'Tower B, Cyber City, DLF Phase 2, Gurugram, India',
    date: '06 Nov 2026',
    dueDate: '06 Dec 2026',
    items: [
      { description: 'Cloud Infrastructure & Managed DevOps Retainer', qty: 1, rate: 15000, amount: 15000 },
      { description: 'Database Backup Replication & Security Patching', qty: 1, rate: 6186, amount: 6186 },
    ],
    subtotal: 21186,
    taxRate: 18,
    taxAmount: 3814,
    total: 25000,
    notes: 'NOTE FOR HACKATHON DEMO: This is a duplicate billing of INV-1001 previously paid on Oct 20.',
  },
  {
    fileName: 'Case_2_Global_Supplies_Tax_Mismatch_INV-1002.pdf',
    invoiceNumber: 'INV-1002',
    vendor: 'Global Supplies Ltd',
    vendorGSTIN: '07AAACG9876Q1Z2',
    vendorAddress: 'Plot 44, Okhla Industrial Area Phase 2, New Delhi, India',
    date: '06 Nov 2026',
    dueDate: '25 Nov 2026',
    items: [
      { description: 'Ergonomic Desk Accessories & Cable Organizers', qty: 10, rate: 500, amount: 5000 },
      { description: 'High-Density Dual-Band Wireless Mesh Routers', qty: 2, rate: 2500, amount: 5000 },
    ],
    subtotal: 10000,
    taxRate: 10,
    taxAmount: 1000, // Expected Total: 11,000! Declared is 11,800
    total: 11800,
    notes: 'NOTE FOR HACKATHON DEMO: Math calculation error. Subtotal 10,000 + 1,000 tax = 11,000, but total says 11,800.',
  },
  {
    fileName: 'Case_3_Bright_Solutions_Unusual_Spike_INV-1003.pdf',
    invoiceNumber: 'INV-1003',
    vendor: 'Bright Solutions',
    vendorGSTIN: '29AAABR4567M1Z8',
    vendorAddress: 'Indiranagar 100ft Road, Bengaluru, Karnataka, India',
    date: '06 Nov 2026',
    dueDate: '06 Dec 2026',
    items: [
      { description: 'Comprehensive Cloud Migration & Emergency Architecture Audit', qty: 1, rate: 80508, amount: 80508 },
    ],
    subtotal: 80508,
    taxRate: 18,
    taxAmount: 14492,
    total: 95000,
    notes: 'NOTE FOR HACKATHON DEMO: Anomalous amount spike (Historical billing average is ~INR 13,000).',
  },
  {
    fileName: 'Case_4_Apex_Logistics_Clean_Verified_APX-9940.pdf',
    invoiceNumber: 'APX-9940',
    vendor: 'Apex Logistics Ltd',
    vendorGSTIN: '33AAAAL3322B1Z1',
    vendorAddress: 'Harbour Expressway Logistics Hub, Chennai, India',
    date: '06 Nov 2026',
    dueDate: '06 Dec 2026',
    items: [
      { description: 'Dedicated Interstate Heavy Freight Container Haulage', qty: 2, rate: 16000, amount: 32000 },
    ],
    subtotal: 32000,
    taxRate: 12,
    taxAmount: 3840,
    total: 35840,
    notes: 'NOTE FOR HACKATHON DEMO: Legitimate verified invoice with 100% compliant arithmetic and no duplicate history.',
  },
];

export async function createInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Top header background
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.06, 0.09, 0.16), // #0F172A
  });

  // Top header text
  page.drawText(data.vendor.toUpperCase(), {
    x: 40,
    y: height - 50,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('COMMERCIAL TAX INVOICE', {
    x: width - 230,
    y: height - 50,
    size: 14,
    font: fontBold,
    color: rgb(0.55, 0.58, 0.95), // accent purple
  });

  // Invoice Details Ribbon
  let y = height - 140;
  page.drawText(`Invoice Number: ${data.invoiceNumber}`, { x: 40, y, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(`Invoice Date: ${data.date}`, { x: 230, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Due Date: ${data.dueDate}`, { x: 400, y, size: 10, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  // Divider
  y -= 15;
  page.drawLine({
    start: { x: 40, y },
    end: { x: width - 40, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  // Vendor & Bill To Boxes
  y -= 25;
  page.drawText('SUPPLIER / VENDOR DETAILS:', { x: 40, y, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('BILL TO / RECIPIENT:', { x: 300, y, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });

  y -= 15;
  page.drawText(data.vendor, { x: 40, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('InvoiceGuard Enterprise Client', { x: 300, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  y -= 14;
  page.drawText(`GSTIN: ${data.vendorGSTIN}`, { x: 40, y, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('GSTIN: 29AAAAA0000A1Z5', { x: 300, y, size: 9, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });

  y -= 14;
  page.drawText(data.vendorAddress, { x: 40, y, size: 8, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });
  page.drawText('Accounts Payable Dept, Financial District', { x: 300, y, size: 8, font: fontRegular, color: rgb(0.35, 0.35, 0.35) });

  // Table Header
  y -= 45;
  page.drawRectangle({
    x: 40,
    y: y - 5,
    width: width - 80,
    height: 24,
    color: rgb(0.94, 0.96, 0.98),
  });

  page.drawText('ITEM DESCRIPTION', { x: 50, y: y + 2, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.3) });
  page.drawText('QTY', { x: 340, y: y + 2, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.3) });
  page.drawText('RATE (INR)', { x: 400, y: y + 2, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.3) });
  page.drawText('AMOUNT (INR)', { x: 480, y: y + 2, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.3) });

  // Items
  for (const item of data.items) {
    y -= 25;
    page.drawText(item.description, { x: 50, y, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(item.qty.toString(), { x: 345, y, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(`INR ${item.rate.toLocaleString()}`, { x: 400, y, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(`INR ${item.amount.toLocaleString()}`, { x: 480, y, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    page.drawLine({
      start: { x: 40, y: y - 8 },
      end: { x: width - 40, y: y - 8 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    });
  }

  // Summary Totals Box
  y -= 40;
  const summaryX = 350;

  page.drawText('Taxable Subtotal:', { x: summaryX, y, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(`INR ${data.subtotal.toLocaleString()}`, { x: summaryX + 130, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  y -= 18;
  page.drawText(`Applicable Tax (${data.taxRate}%):`, { x: summaryX, y, size: 10, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(`INR ${data.taxAmount.toLocaleString()}`, { x: summaryX + 130, y, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

  y -= 24;
  page.drawRectangle({
    x: summaryX - 10,
    y: y - 6,
    width: width - summaryX - 30,
    height: 26,
    color: rgb(0.93, 0.94, 0.98),
  });

  page.drawText('TOTAL PAYABLE:', { x: summaryX, y, size: 11, font: fontBold, color: rgb(0.12, 0.23, 0.54) });
  page.drawText(`INR ${data.total.toLocaleString()}`, { x: summaryX + 120, y, size: 12, font: fontBold, color: rgb(0.12, 0.23, 0.54) });

  // Demonstration Case Callout
  if (data.notes) {
    y -= 50;
    page.drawRectangle({
      x: 40,
      y: y - 8,
      width: width - 80,
      height: 34,
      color: rgb(1, 0.97, 0.9),
      borderColor: rgb(0.9, 0.7, 0.3),
      borderWidth: 1,
    });
    page.drawText(data.notes, {
      x: 50,
      y: y + 8,
      size: 9,
      font: fontBold,
      color: rgb(0.6, 0.35, 0),
    });
  }

  // Footer & Signature
  page.drawLine({
    start: { x: 40, y: 80 },
    end: { x: width - 40, y: 80 },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  page.drawText('This is a computer-generated tax invoice verified by InvoiceGuard AI.', {
    x: 40,
    y: 60,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('Authorized Signatory', {
    x: width - 150,
    y: 60,
    size: 9,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });

  return await pdfDoc.save();
}

async function run() {
  const outputDirs = [
    path.resolve(process.cwd(), '../sample_invoices'),
    path.resolve(process.cwd(), '../frontend/public/samples'),
  ];

  for (const dir of outputDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Generating realistic sample PDF invoices...');

  for (const inv of sampleInvoices) {
    const bytes = await createInvoicePdf(inv);
    for (const dir of outputDirs) {
      const filePath = path.join(dir, inv.fileName);
      fs.writeFileSync(filePath, bytes);
      console.log(`Saved: ${filePath}`);
    }
  }

  console.log('Sample PDF generation complete!');
}

run().catch(console.error);
