// ── Sample demonstration data ──
// Synthesizes pre-loaded test cases for hackathon demonstration.

import { store } from '../db/store.js';
import { Invoice } from '../types/index.js';
import { verifyInvoice } from './invoiceVerification.js';

export function initializeDemoData(): void {
  // Check if already populated
  if (store.getInvoices().length > 0) return;

  console.log('[DemoData] Initializing pre-loaded synthetic demonstration records...');

  const demoInvoices: Invoice[] = [
    // ── CASE 1: Original base invoice for ABC Technologies (already processed & paid)
    {
      id: 'demo-inv-abc-original',
      invoiceNumber: 'INV-1001',
      vendor: 'ABC Technologies',
      vendorGSTIN: '27AABCT1234F1Z5',
      vendorAddress: 'Tower B, Cyber City, Gurugram, India',
      date: '2026-10-15',
      dueDate: '2026-11-14',
      subtotal: 21186,
      taxRate: 18,
      taxAmount: 3814,
      total: 25000,
      currency: 'INR',
      description: 'Monthly cloud infrastructure and maintenance retainer',
      status: 'resolved',
      resolution: 'Approved and paid via wire transfer on Oct 20. Verified authentic PO-8821.',
      resolvedAt: '2026-10-20T10:30:00Z',
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-20T10:30:00Z',
    },

    // ── CASE 1 DUPLICATE: Re-submitted invoice from ABC Technologies
    {
      id: 'demo-case-1-duplicate',
      invoiceNumber: 'INV-1001',
      vendor: 'ABC Technologies',
      vendorGSTIN: '27AABCT1234F1Z5',
      vendorAddress: 'Tower B, Cyber City, Gurugram, India',
      date: '2026-11-02',
      dueDate: '2026-12-02',
      subtotal: 21186,
      taxRate: 18,
      taxAmount: 3814,
      total: 25000,
      currency: 'INR',
      description: 'Monthly cloud infrastructure and maintenance retainer (Duplicate submission)',
      status: 'pending',
      createdAt: '2026-11-02T11:15:00Z',
      updatedAt: '2026-11-02T11:15:00Z',
    },

    // ── CASE 2: Tax Calculation Mismatch
    {
      id: 'demo-case-2-tax-mismatch',
      invoiceNumber: 'INV-1002',
      vendor: 'Global Supplies',
      vendorGSTIN: '07AAACG9876Q1Z2',
      vendorAddress: 'Industrial Area Phase 2, New Delhi, India',
      date: '2026-11-04',
      dueDate: '2026-11-25',
      subtotal: 10000,
      taxRate: 10,
      taxAmount: 1000, // Expected total = 11,000, but entered as 11,800
      total: 11800,
      currency: 'INR',
      description: 'Office logistics and ergonomic workstation components',
      status: 'pending',
      createdAt: '2026-11-04T14:20:00Z',
      updatedAt: '2026-11-04T14:20:00Z',
    },

    // ── Historical baseline for Bright Solutions
    {
      id: 'demo-bright-hist-1',
      invoiceNumber: 'BS-2026-08',
      vendor: 'Bright Solutions',
      vendorGSTIN: '29AAABR4567M1Z8',
      date: '2026-08-10',
      dueDate: '2026-09-10',
      subtotal: 10169,
      taxRate: 18,
      taxAmount: 1831,
      total: 12000,
      currency: 'INR',
      description: 'Monthly SEO and content marketing services',
      status: 'verified',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-12T11:00:00Z',
    },
    {
      id: 'demo-bright-hist-2',
      invoiceNumber: 'BS-2026-09',
      vendor: 'Bright Solutions',
      vendorGSTIN: '29AAABR4567M1Z8',
      date: '2026-09-12',
      dueDate: '2026-10-12',
      subtotal: 11864,
      taxRate: 18,
      taxAmount: 2136,
      total: 14000,
      currency: 'INR',
      description: 'Monthly SEO and digital ad campaign management',
      status: 'verified',
      createdAt: '2026-09-12T10:00:00Z',
      updatedAt: '2026-09-14T11:00:00Z',
    },

    // ── CASE 3: Unusual High Amount from Bright Solutions
    {
      id: 'demo-case-3-unusual-amount',
      invoiceNumber: 'INV-1003',
      vendor: 'Bright Solutions',
      vendorGSTIN: '29AAABR4567M1Z8',
      date: '2026-11-05',
      dueDate: '2026-12-05',
      subtotal: 80508,
      taxRate: 18,
      taxAmount: 14492,
      total: 95000, // 7x the average of 13,000
      currency: 'INR',
      description: 'Emergency consulting & comprehensive enterprise platform migration',
      status: 'pending',
      createdAt: '2026-11-05T09:30:00Z',
      updatedAt: '2026-11-05T09:30:00Z',
    },

    // ── Additional authentic history
    {
      id: 'demo-norm-apex-1',
      invoiceNumber: 'APX-7741',
      vendor: 'Apex Logistics Ltd',
      vendorGSTIN: '33AAAAL3322B1Z1',
      date: '2026-10-02',
      dueDate: '2026-11-02',
      subtotal: 32000,
      taxRate: 12,
      taxAmount: 3840,
      total: 35840,
      currency: 'INR',
      description: 'Interstate freight shipping and warehousing charges',
      status: 'verified',
      createdAt: '2026-10-02T08:00:00Z',
      updatedAt: '2026-10-04T12:00:00Z',
    },
    {
      id: 'demo-norm-zenith-1',
      invoiceNumber: 'ZEN-4029',
      vendor: 'Zenith Facility Services',
      vendorGSTIN: '27AAAFZ8899C1Z4',
      date: '2026-10-25',
      dueDate: '2026-11-25',
      subtotal: 18500,
      taxRate: 18,
      taxAmount: 3330,
      total: 21830,
      currency: 'INR',
      description: 'Commercial HVAC quarterly inspection and filter replacement',
      status: 'verified',
      createdAt: '2026-10-25T11:00:00Z',
      updatedAt: '2026-10-26T14:00:00Z',
    },
    {
      id: 'demo-norm-vertex-1',
      invoiceNumber: 'VTX-9011',
      vendor: 'Vertex Software Solutions',
      vendorGSTIN: '19AAACV5544J1Z9',
      date: '2026-10-28',
      dueDate: '2026-11-28',
      subtotal: 45000,
      taxRate: 18,
      taxAmount: 8100,
      total: 53100,
      currency: 'INR',
      description: 'Annual enterprise ERP user seat licenses',
      status: 'verified',
      createdAt: '2026-10-28T16:00:00Z',
      updatedAt: '2026-10-30T09:00:00Z',
    },
    {
      id: 'demo-norm-quantum-1',
      invoiceNumber: 'QTM-1122',
      vendor: 'Quantum Hardware Inc',
      vendorGSTIN: '06AAAQ8811K1Z0',
      date: '2026-11-01',
      dueDate: '2026-12-01',
      subtotal: 62000,
      taxRate: 18,
      taxAmount: 11160,
      total: 73160,
      currency: 'INR',
      description: 'Development workstation RAM upgrades and NVMe SSD kits',
      status: 'verified',
      createdAt: '2026-11-01T13:45:00Z',
      updatedAt: '2026-11-03T10:00:00Z',
    },
  ];

  for (const inv of demoInvoices) {
    store.addInvoice(inv);
    // If not pending, also add baseline verification
    if (inv.status !== 'pending') {
      const result = verifyInvoice(inv);
      store.addVerificationResult(result);
    }
  }

  console.log(`[DemoData] Pre-loaded ${demoInvoices.length} demo invoices.`);
}
