// ── Hindsight memory routes ──

import { Router, Request, Response } from 'express';
import {
  retainMemory,
  recallMemories,
  reflectOnMemories,
  checkHealth,
} from '../services/hindsightService.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// ── POST /api/hindsight/retain ──
router.post(
  '/retain',
  asyncHandler(async (req: Request, res: Response) => {
    const { content, metadata } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw createError('Content is required and must be a non-empty string', 400);
    }

    const result = await retainMemory(content.trim(), metadata);

    res.json({
      success: result.available,
      stored: result.available,
      data: result.data,
      error: result.error,
    });
  })
);

// ── POST /api/hindsight/recall ──
router.post(
  '/recall',
  asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw createError('Query is required and must be a non-empty string', 400);
    }

    const result = await recallMemories(query.trim());

    res.json({
      success: result.available,
      available: result.available,
      memories: result.available ? result.data : [],
      error: result.error,
    });
  })
);

// ── GET /api/hindsight/memories ──
router.get(
  '/memories',
  asyncHandler(async (req: Request, res: Response) => {
    const query = (req.query.q as string) || 'all invoice verification experiences';

    const result = await recallMemories(query);

    res.json({
      success: result.available,
      available: result.available,
      memories: result.available ? result.data : [],
      error: result.error,
    });
  })
);

// ── POST /api/hindsight/reflect ──
router.post(
  '/reflect',
  asyncHandler(async (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw createError('Query is required and must be a non-empty string', 400);
    }

    const result = await reflectOnMemories(query.trim());

    res.json({
      success: result.available,
      available: result.available,
      reflection: result.available ? result.data : null,
      error: result.error,
    });
  })
);

// ── GET /api/hindsight/health ──
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await checkHealth();
    res.json({
      available: result.available,
      error: result.error,
    });
  })
);

export default router;
