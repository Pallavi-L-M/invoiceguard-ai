// ── AI chat assistant routes ──

import { Router, Request, Response } from 'express';
import { chat } from '../services/llmService.js';
import { store } from '../db/store.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

const router = Router();

// ── POST /api/assistant/chat ──
router.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const { message, conversationHistory, invoiceId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw createError('Message is required and must be a non-empty string', 400);
    }

    // Optionally load invoice context
    let invoiceContext = null;
    if (invoiceId) {
      invoiceContext = store.getInvoice(invoiceId) || null;
    }

    const reply = await chat(
      message.trim(),
      conversationHistory || [],
      invoiceContext
    );

    res.json({
      success: true,
      reply,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
