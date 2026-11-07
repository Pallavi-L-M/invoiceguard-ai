// ── OCR & Document Extraction Service ──
// Uses Tesseract.js for optical character recognition,
// parsing invoice numbers, vendor names, dates, subtotals, taxes, and totals.

import { createWorker } from 'tesseract.js';
import { Invoice, OCRResult } from '../types/index.js';

export async function extractFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  let worker: any = null;

  try {
    // Basic format validation
    if (!['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'].includes(mimeType)) {
      return {
        success: false,
        extractedText: '',
        parsedData: {},
        confidence: 0,
        error: `Unsupported file format: ${mimeType}. Supported formats: JPG, PNG, TIFF.`,
      };
    }

    // PDF files cannot directly be fed to Tesseract image worker without pdf2image;
    // check if it's PDF
    if (mimeType === 'application/pdf') {
      // In a lightweight MVP without native poppler binaries,
      // return a polite, honest notice so user can input or use image format
      return {
        success: false,
        extractedText: '',
        parsedData: {},
        confidence: 0,
        error: 'Direct PDF OCR requires rendering binaries. Please upload as PNG/JPG or enter details in the manual form below.',
      };
    }

    worker = await createWorker('eng');
    const ret = await worker.recognize(buffer);
    const text = ret.data.text || '';
    const confidence = (ret.data.confidence || 0) / 100;

    await worker.terminate();
    worker = null;

    if (!text || text.trim().length < 5) {
      return {
        success: false,
        extractedText: text,
        parsedData: {},
        confidence,
        error: 'Unable to extract legible text from the uploaded document. Please check image clarity or enter details manually.',
      };
    }

    const parsedData = parseInvoiceText(text);

    return {
      success: true,
      extractedText: text,
      parsedData,
      confidence,
    };
  } catch (err: unknown) {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
    const msg = err instanceof Error ? err.message : 'Unknown OCR failure';
    console.error('[OCR] Extraction error:', msg);
    return {
      success: false,
      extractedText: '',
      parsedData: {},
      confidence: 0,
      error: `OCR extraction failed: ${msg}. You can enter details manually.`,
    };
  }
}

/**
 * Heuristic parsing of invoice text
 * Extracts invoice number, vendor, dates, and amounts without fabricating values.
 */
function parseInvoiceText(text: string): Partial<Invoice> {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const result: Partial<Invoice> = {};

  // 1. Invoice Number patterns
  const invNumberRegex = /(?:invoice|inv|bill|ref)[\s#.:-]*([A-Z0-9-]{3,20})/i;
  for (const line of lines) {
    const match = line.match(invNumberRegex);
    if (match && match[1]) {
      // Filter out common false matches
      if (!['DATE', 'TOTAL', 'DUE', 'CASH', 'PAID'].includes(match[1].toUpperCase())) {
        result.invoiceNumber = match[1].trim();
        break;
      }
    }
  }

  // 2. Dates
  // DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD MMM YYYY
  const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{2,4})/i;
  for (const line of lines) {
    if (/date/i.test(line)) {
      const match = line.match(dateRegex);
      if (match && !result.date) {
        result.date = normalizeDate(match[0]);
      } else if (match && /due/i.test(line) && !result.dueDate) {
        result.dueDate = normalizeDate(match[0]);
      }
    }
  }

  // 3. Vendor Name (often near the top 5 lines)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Skip if it looks like a header keyword or date
    if (!/(invoice|bill to|ship to|date|tax invoice|receipt)/i.test(line) && line.length > 3 && line.length < 50) {
      result.vendor = line;
      break;
    }
  }

  // 4. GSTIN pattern (India 15-character alphanumeric)
  const gstinRegex = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/i;
  for (const line of lines) {
    const match = line.match(gstinRegex);
    if (match) {
      result.vendorGSTIN = match[0].toUpperCase();
      break;
    }
  }

  // 5. Currency / Amounts
  // Look for Subtotal, Tax, Total
  for (const line of lines) {
    const amountMatch = line.match(/(?:₹|INR|Rs\.?|USD|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2})?)/);
    
    if (amountMatch && amountMatch[1]) {
      const numVal = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!isNaN(numVal) && numVal > 0) {
        if (/(?:total amount|grand total|net total|balance due|total)/i.test(line) && !result.total) {
          result.total = numVal;
        } else if (/(?:subtotal|sub-total|sub total|taxable value)/i.test(line) && !result.subtotal) {
          result.subtotal = numVal;
        } else if (/(?:tax|gst|vat|cgst|sgst)/i.test(line) && !result.taxAmount && !line.includes('%')) {
          result.taxAmount = numVal;
        }
      }
    }

    // Tax rate percentage check
    const rateMatch = line.match(/(\d{1,2}(?:\.\d{1,2})?)\s*%/);
    if (rateMatch && rateMatch[1] && !result.taxRate) {
      const rate = parseFloat(rateMatch[1]);
      if (rate >= 0 && rate <= 40) {
        result.taxRate = rate;
      }
    }
  }

  return result;
}

function normalizeDate(raw: string): string {
  try {
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {}
  return raw;
}
