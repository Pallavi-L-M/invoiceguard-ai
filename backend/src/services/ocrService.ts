// ── OCR & Document Extraction Service ──
// Uses Tesseract.js for optical character recognition,
// parsing invoice numbers, vendor names, dates, subtotals, taxes, and totals.

import { createWorker } from 'tesseract.js';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
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
        error: `Unsupported file format: ${mimeType}. Supported formats: PDF, JPG, PNG, TIFF.`,
      };
    }

    worker = await createWorker('eng');
    let text = '';
    let confidence = 0;

    if (mimeType === 'application/pdf') {
      const document = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
      const pageTexts: string[] = [];
      let confidenceTotal = 0;

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context as any, viewport } as any).promise;
        const result = await worker.recognize(canvas.toBuffer('image/png'));
        pageTexts.push(result.data.text || '');
        confidenceTotal += result.data.confidence || 0;
      }

      text = pageTexts.join('\n');
      confidence = document.numPages ? confidenceTotal / document.numPages / 100 : 0;
      await document.destroy();
    } else {
      const ret = await worker.recognize(buffer);
      text = ret.data.text || '';
      confidence = (ret.data.confidence || 0) / 100;
    }

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
 * Heuristic parsing of invoice text. Missing values are left blank rather than guessed.
 */
function parseInvoiceText(text: string): Partial<Invoice> {
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l.length > 0);
  const result: Partial<Invoice> = {};

  // 1. Invoice Number patterns
  const invNumberRegex = /(?:invoice\s*(?:number|no\.?|#|id)?|inv\.?\s*(?:no\.?|#)|bill\s*(?:no\.?|#)|reference\s*(?:no\.?|#)?)[\s:.-]*([A-Z0-9][A-Z0-9/-]{2,24})/i;
  for (const line of lines) {
    const match = line.match(invNumberRegex);
    if (match && match[1]) {
      // Filter out common false matches
      if (!['DATE', 'TOTAL', 'DUE', 'CASH', 'PAID', 'NUMBER'].includes(match[1].toUpperCase())) {
        result.invoiceNumber = match[1].trim();
        break;
      }
    }
  }

  // 2. Dates
  // DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD MMM YYYY
  const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{2,4})/i;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (!match) continue;
    const normalized = normalizeDate(match[0]);
    if (/due|payable/i.test(line) && !result.dueDate) {
      result.dueDate = normalized;
    } else if (/invoice\s*date|date\s*of\s*invoice|^date\b/i.test(line) && !result.date) {
      result.date = normalized;
    }
  }

  // 3. Vendor Name, preferring an explicit supplier/vendor label.
  const vendorLabelIndex = lines.findIndex((line) => /^(?:vendor|supplier|seller|from)\s*[:#-]/i.test(line));
  if (vendorLabelIndex >= 0) {
    const vendorLabel = lines[vendorLabelIndex].replace(/^(?:vendor|supplier|seller|from)\s*[:#-]\s*/i, '').trim();
    result.vendor = vendorLabel || lines[vendorLabelIndex + 1] || '';
  } else {
    for (const line of lines.slice(0, 8)) {
      if (!/(invoice|bill to|ship to|date|tax invoice|receipt|gstin|phone|email|www\.)/i.test(line) && line.length > 3 && line.length < 60 && !/\d{4,}/.test(line)) {
        result.vendor = line;
        break;
      }
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

  // 5. Currency / Amounts. Capture values after field labels to avoid using
  // unrelated numbers such as invoice IDs or dates as monetary amounts.
  for (const line of lines) {
    const amounts = [...line.matchAll(/[0-9][0-9,]*(?:\.\d{1,2})?/g)]
      .filter((match) => !/^\s*%/.test(line.slice((match.index || 0) + match[0].length)));
    const amountMatch = amounts[amounts.length - 1];
    if (amountMatch?.[0]) {
      const numVal = parseFloat(amountMatch[0].replace(/,/g, ''));
      if (Number.isFinite(numVal) && numVal > 0) {
        if (/(?:grand\s*total|net\s*total|total\s*amount|balance\s*due|amount\s*due|^total\b)/i.test(line) && !result.total) {
          result.total = numVal;
        } else if (/(?:sub[- ]?total|taxable\s*value|^net\s*amount\b)/i.test(line) && !result.subtotal) {
          result.subtotal = numVal;
        } else if (/(?:tax\b|gst\b|cgst|sgst|igst|vat\b)/i.test(line) && !result.taxAmount) {
          result.taxAmount = numVal;
        }
      }
    }

    // Prefer a labeled rate; only use a percentage on a tax line.
    const rateMatch = line.match(/(?:tax|gst|vat)?\s*(\d{1,2}(?:\.\d{1,2})?)\s*%/i);
    if (rateMatch?.[1] && !result.taxRate && /(tax|gst|vat|%)/i.test(line)) {
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
    const iso = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    const numeric = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (numeric) {
      let [, first, second, year] = numeric;
      let day = Number(first);
      let month = Number(second);
      if (month > 12) [day, month] = [month, day];
      if (year.length === 2) year = `20${year}`;
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  } catch {}
  return raw;
}
