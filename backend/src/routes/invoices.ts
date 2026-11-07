// ── Invoice CRUD & verification routes ──

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { Invoice } from '../types/index.js';
import { verifyInvoice } from '../services/invoiceVerification.js';
import { extractFromImage } from '../services/ocrService.js';
import { analyzeInvoice } from '../services/llmService.js';
import { retainMemory } from '../services/hindsightService.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// Multer – store uploads in memory (MVP)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload JPG, PNG, TIFF, or PDF.'));
    }
  },
});

// ── POST /api/invoices/upload ──
router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const result = await extractFromImage(req.file.buffer, req.file.mimetype);

    res.json({
      success: result.success,
      extractedText: result.extractedText,
      parsedData: result.parsedData,
      confidence: result.confidence,
      error: result.error,
      fileName: req.file.originalname,
    });
  })
);

// ── POST /api/invoices ──
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body;

    const invoice: Invoice = {
      id: uuidv4(),
      invoiceNumber: body.invoiceNumber || '',
      vendor: body.vendor || '',
      vendorAddress: body.vendorAddress,
      vendorGSTIN: body.vendorGSTIN,
      date: body.date || new Date().toISOString().split('T')[0],
      dueDate: body.dueDate,
      subtotal: parseFloat(body.subtotal) || 0,
      taxRate: parseFloat(body.taxRate) || 0,
      taxAmount: parseFloat(body.taxAmount) || 0,
      total: parseFloat(body.total) || 0,
      currency: body.currency || 'INR',
      description: body.description,
      lineItems: body.lineItems,
      status: 'pending',
      ocrConfidence: body.ocrConfidence,
      sourceFile: body.sourceFile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.addInvoice(invoice);

    res.status(201).json({ success: true, invoice });
  })
);

// ── GET /api/invoices ──
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { status, vendor, dateFrom, dateTo, search } = req.query;

    const invoices = store.getInvoices({
      status: status as string | undefined,
      vendor: vendor as string | undefined,
      dateFrom: dateFrom as string | undefined,
      dateTo: dateTo as string | undefined,
      search: search as string | undefined,
    });

    res.json({ success: true, invoices, total: invoices.length });
  })
);

// ── GET /api/invoices/:id ──
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = store.getInvoice(req.params.id);
    if (!invoice) {
      throw createError('Invoice not found', 404);
    }

    const verifications = store.getVerificationResults(invoice.id);

    res.json({ success: true, invoice, verifications });
  })
);

// ── PUT /api/invoices/:id ──
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = store.getInvoice(req.params.id);
    if (!invoice) {
      throw createError('Invoice not found', 404);
    }

    const updated = store.updateInvoice(req.params.id, req.body);
    res.json({ success: true, invoice: updated });
  })
);

// ── POST /api/invoices/:id/verify ──
router.post(
  '/:id/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = store.getInvoice(req.params.id);
    if (!invoice) {
      throw createError('Invoice not found', 404);
    }

    // Run rule-based verification
    const verificationResult = verifyInvoice(invoice);

    // Run LLM analysis (enriches with Hindsight context)
    const { analysis, hindsightContext } = await analyzeInvoice(
      invoice,
      verificationResult
    );
    verificationResult.llmAnalysis = analysis;
    verificationResult.hindsightContext = hindsightContext;

    // Persist the result
    store.addVerificationResult(verificationResult);

    // Update invoice status
    const newStatus = verificationResult.issues.length > 0 ? 'flagged' : 'verified';
    store.updateInvoice(invoice.id, { status: newStatus });

    res.json({
      success: true,
      verification: verificationResult,
      invoiceStatus: newStatus,
    });
  })
);

// ── POST /api/invoices/:id/resolve ──
router.post(
  '/:id/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = store.getInvoice(req.params.id);
    if (!invoice) {
      throw createError('Invoice not found', 404);
    }

    const { resolution } = req.body;
    if (!resolution) {
      throw createError('Resolution description is required', 400);
    }

    // Update invoice
    const updated = store.updateInvoice(invoice.id, {
      status: 'resolved',
      resolution,
      resolvedAt: new Date().toISOString(),
    });

    // Build a rich memory for Hindsight
    const verifications = store.getVerificationResults(invoice.id);
    const latestVerification = verifications[verifications.length - 1];

    let memoryContent = `Invoice ${invoice.invoiceNumber} from ${invoice.vendor} for ₹${invoice.total.toLocaleString()} was resolved. `;
    memoryContent += `Resolution: ${resolution}. `;

    if (latestVerification) {
      const issueTypes = latestVerification.issues.map((i) => i.type).join(', ');
      memoryContent += `Issues found during verification: ${issueTypes || 'none'}. `;
      memoryContent += `Overall risk was ${latestVerification.overallRisk}. `;
    }

    // Retain in Hindsight
    const hindsightResult = await retainMemory(memoryContent, {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      vendor: invoice.vendor,
      amount: invoice.total,
      resolution,
      resolvedAt: new Date().toISOString(),
    });

    // Add resolve activity
    store.addActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'resolve',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      vendor: invoice.vendor,
      description: `Invoice ${invoice.invoiceNumber} resolved: ${resolution}`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      invoice: updated,
      hindsight: {
        stored: hindsightResult.available,
        error: hindsightResult.error,
      },
    });
  })
);

export default router;
