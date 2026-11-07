// ── InvoiceGuard AI Backend Server ──
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import invoicesRouter from './routes/invoices.js';
import hindsightRouter from './routes/hindsight.js';
import assistantRouter from './routes/assistant.js';
import dashboardRouter from './routes/dashboard.js';
import reportsRouter from './routes/reports.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeDemoData } from './services/demoData.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: '*', // Allow development frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'InvoiceGuard AI API',
    hindsightUrl: process.env.HINDSIGHT_API_URL || 'http://localhost:8888',
    geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/invoices', invoicesRouter);
app.use('/api/hindsight', hindsightRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);

// Global Error Handler
app.use(errorHandler);

// Initialize Sample Demonstration Data
initializeDemoData();

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🛡️  InvoiceGuard AI Server running on port ${PORT}`);
  console.log(`🧠 Hindsight Base URL: ${process.env.HINDSIGHT_API_URL || 'http://localhost:8888'}`);
  console.log(`🤖 Gemini API Key configured: ${!!process.env.GEMINI_API_KEY}`);
  console.log(`===============================================`);
});

export default app;
