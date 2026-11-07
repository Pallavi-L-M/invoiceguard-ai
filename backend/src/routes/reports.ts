// ── Reports & analytics routes ──

import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';
import {
  MonthlyReport,
  ErrorCategoryReport,
  VendorReport,
  IssueType,
} from '../types/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

const ISSUE_LABELS: Record<IssueType, string> = {
  duplicate: 'Duplicate Invoice',
  math_error: 'Math Error',
  tax_mismatch: 'Tax Mismatch',
  missing_field: 'Missing Fields',
  unusual_amount: 'Unusual Amount',
  vendor_change: 'Vendor Change',
};

// ── GET /api/reports/monthly ──
router.get(
  '/monthly',
  asyncHandler(async (_req: Request, res: Response) => {
    const invoices = store.getInvoices();
    const monthMap = new Map<string, MonthlyReport>();

    for (const inv of invoices) {
      const monthKey = inv.date.slice(0, 7); // YYYY-MM
      const existing = monthMap.get(monthKey) || {
        month: monthKey,
        invoicesProcessed: 0,
        invoicesFlagged: 0,
        invoicesResolved: 0,
        totalValue: 0,
        flaggedValue: 0,
      };

      existing.invoicesProcessed++;
      existing.totalValue += inv.total;

      if (inv.status === 'flagged') {
        existing.invoicesFlagged++;
        existing.flaggedValue += inv.total;
      }
      if (inv.status === 'resolved') {
        existing.invoicesResolved++;
      }

      monthMap.set(monthKey, existing);
    }

    // Sort by month descending
    const reports = Array.from(monthMap.values()).sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    res.json({ success: true, reports });
  })
);

// ── GET /api/reports/errors ──
router.get(
  '/errors',
  asyncHandler(async (_req: Request, res: Response) => {
    const allVerifications = store.getAllVerificationResults();
    const counts: Record<IssueType, number> = {
      duplicate: 0,
      math_error: 0,
      tax_mismatch: 0,
      missing_field: 0,
      unusual_amount: 0,
      vendor_change: 0,
    };

    let totalIssues = 0;
    for (const vr of allVerifications) {
      for (const issue of vr.issues) {
        counts[issue.type] = (counts[issue.type] || 0) + 1;
        totalIssues++;
      }
    }

    const reports: ErrorCategoryReport[] = Object.entries(counts).map(
      ([category, count]) => ({
        category: category as IssueType,
        label: ISSUE_LABELS[category as IssueType] || category,
        count,
        percentage: totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0,
      })
    );

    // Sort by count descending
    reports.sort((a, b) => b.count - a.count);

    res.json({ success: true, reports, totalIssues });
  })
);

// ── GET /api/reports/vendors ──
router.get(
  '/vendors',
  asyncHandler(async (_req: Request, res: Response) => {
    const vendors = store.getAllVendors();
    const reports: VendorReport[] = [];

    for (const vendor of vendors) {
      const invoices = store.getInvoicesByVendor(vendor);
      const totalValue = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const flaggedCount = invoices.filter((inv) => inv.status === 'flagged').length;

      reports.push({
        vendor,
        invoiceCount: invoices.length,
        totalValue,
        averageValue: invoices.length > 0 ? Math.round(totalValue / invoices.length) : 0,
        flaggedCount,
        flagRate:
          invoices.length > 0
            ? Math.round((flaggedCount / invoices.length) * 100)
            : 0,
      });
    }

    // Sort by total value descending
    reports.sort((a, b) => b.totalValue - a.totalValue);

    res.json({ success: true, reports });
  })
);

export default router;
