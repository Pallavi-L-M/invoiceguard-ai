// ── Dashboard statistics routes ──

import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';
import { DashboardStats, IssueType } from '../types/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ── GET /api/dashboard/stats ──
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const baseStats = store.getStats();
    const allVerifications = store.getAllVerificationResults();
    const recentActivity = store.getRecentActivities(15);

    // Build issue breakdown
    const issueBreakdown: Record<IssueType, number> = {
      duplicate: 0,
      math_error: 0,
      tax_mismatch: 0,
      missing_field: 0,
      unusual_amount: 0,
      vendor_change: 0,
    };

    for (const vr of allVerifications) {
      for (const issue of vr.issues) {
        issueBreakdown[issue.type] = (issueBreakdown[issue.type] || 0) + 1;
      }
    }

    const stats: DashboardStats = {
      ...baseStats,
      issueBreakdown,
      recentActivity,
    };

    res.json({ success: true, stats });
  })
);

export default router;
