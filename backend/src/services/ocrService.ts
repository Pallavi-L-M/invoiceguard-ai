// ── OCR & Document Extraction Service ──
// Uses Tesseract.js for optical character recognition,
// parsing invoice numbers, vendor names, dates, subtotals, taxes, and totals.

import { createWorker } from 'tesseract.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
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

      try {
        for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
          const page = await document.getPage(pageNumber);
          const embeddedText = await extractPdfPageText(page);

          if (embeddedText.trim().length >= 5) {
            pageTexts.push(embeddedText);
            confidenceTotal += 95;
            continue;
          }

          const viewport = page.getViewport({ scale: 2.5 });
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          const context = canvas.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context as any, viewport } as any).promise;
          const result = await recognizeWithPreprocessing(worker, canvas.toBuffer('image/png'));
          pageTexts.push(result.text);
          confidenceTotal += result.confidence;
          await page.cleanup();
        }
      } finally {
        await document.destroy();
      }

      text = pageTexts.join('\n');
      confidence = document.numPages ? confidenceTotal / document.numPages / 100 : 0;
    } else {
      const result = await recognizeWithPreprocessing(worker, buffer);
      text = result.text;
      confidence = result.confidence / 100;
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

async function extractPdfPageText(page: any): Promise<string> {
  const content = await page.getTextContent();
  const rows = new Map<number, Array<{ x: number; text: string }>>();

  for (const item of content.items as any[]) {
    if (typeof item.str !== 'string' || !item.str.trim()) continue;
    const transform = item.transform as number[] | undefined;
    const x = transform?.[4] || 0;
    const y = transform?.[5] || 0;
    const rowKey = Math.round(y / 2);
    const row = rows.get(rowKey) || [];
    row.push({ x, text: item.str.trim() });
    rows.set(rowKey, row);
  }

  return [...rows.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join(' '))
    .join('\n');
}

async function recognizeWithPreprocessing(worker: any, imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
  const first = await worker.recognize(imageBuffer);
  const firstText = first.data.text || '';
  const firstConfidence = first.data.confidence || 0;

  if (firstText.trim().length >= 20 && firstConfidence >= 45) {
    return { text: firstText, confidence: firstConfidence };
  }

  const image = await loadImage(imageBuffer);
  const scale = Math.min(2, 4000 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height);
  const threshold = otsuThreshold(pixels.data);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const gray = Math.round(0.299 * pixels.data[i] + 0.587 * pixels.data[i + 1] + 0.114 * pixels.data[i + 2]);
    const value = gray > threshold ? 255 : 0;
    pixels.data[i] = value;
    pixels.data[i + 1] = value;
    pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);

  const second = await worker.recognize(canvas.toBuffer('image/png'));
  const secondText = second.data.text || '';
  const secondConfidence = second.data.confidence || 0;
  const firstScore = firstConfidence * Math.min(firstText.trim().length / 40, 1);
  const secondScore = secondConfidence * Math.min(secondText.trim().length / 40, 1);
  return secondScore > firstScore
    ? { text: secondText, confidence: secondConfidence }
    : { text: firstText, confidence: firstConfidence };
}

function otsuThreshold(data: Uint8ClampedArray): number {
  const histogram = new Array<number>(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[gray] += 1;
  }

  const pixelCount = data.length / 4;
  let total = 0;
  for (let i = 0; i < 256; i++) total += i * histogram[i];

  let backgroundWeight = 0;
  let backgroundSum = 0;
  let bestVariance = -1;
  let threshold = 180;

  for (let i = 0; i < 256; i++) {
    backgroundWeight += histogram[i];
    if (!backgroundWeight) continue;
    const foregroundWeight = pixelCount - backgroundWeight;
    if (!foregroundWeight) break;
    backgroundSum += i * histogram[i];
    const backgroundMean = backgroundSum / backgroundWeight;
    const foregroundMean = (total - backgroundSum) / foregroundWeight;
    const variance = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = i;
    }
  }
  return Math.max(80, Math.min(220, threshold));
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
  const dateRegex = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})|(\d{1,2}[\s-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,-]+\d{2,4})/gi;
  const dateLabelRegex = /\b(payment\s+due(?:\s+date)?|due\s+date|payable(?:\s+date)?|invoice\s+date|date\s+of\s+invoice|due|date)\b/gi;
  for (const line of lines) {
    for (const match of line.matchAll(dateRegex)) {
      const dateIndex = match.index || 0;
      const precedingText = line.slice(0, dateIndex);
      const labels = [...precedingText.matchAll(dateLabelRegex)];
      const lastLabel = labels[labels.length - 1]?.[0] || '';
      const normalized = normalizeDate(match[0]);

      if (/due|payable/i.test(lastLabel) && !result.dueDate) {
        result.dueDate = normalized;
      } else if (lastLabel && !result.date) {
        result.date = normalized;
      }
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
