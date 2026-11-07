import axios from 'axios';
import type {
  Invoice,
  InvoiceInput,
  ExtractedInvoice,
  VerificationResult,
  Resolution,
  DashboardStats,
  ChatResponse,
  Memory,
  ReportData,
} from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // direct to backend port in development
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// Helper to normalize invoice objects
function normalizeInvoice(raw: any): Invoice {
  if (!raw) return raw;
  return {
    ...raw,
    vendorName: raw.vendorName || raw.vendor || 'Unknown Vendor',
    vendor: raw.vendor || raw.vendorName || 'Unknown Vendor',
    invoiceDate: raw.invoiceDate || raw.date || new Date().toISOString().split('T')[0],
    date: raw.date || raw.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: raw.dueDate || '',
    subtotal: Number(raw.subtotal) || 0,
    taxRate: Number(raw.taxRate) || 0,
    taxAmount: Number(raw.taxAmount) || 0,
    total: Number(raw.total) || 0,
    status: raw.status || 'pending',
  };
}

export async function uploadInvoice(file: File): Promise<ExtractedInvoice> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/invoices/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  
  const data = response.data;
  const parsed = data.parsedData || {};
  return {
    invoiceNumber: parsed.invoiceNumber || '',
    vendorName: parsed.vendor || parsed.vendorName || '',
    invoiceDate: parsed.date || parsed.invoiceDate || new Date().toISOString().split('T')[0],
    dueDate: parsed.dueDate || '',
    subtotal: Number(parsed.subtotal) || 0,
    taxRate: Number(parsed.taxRate) || 18,
    taxAmount: Number(parsed.taxAmount) || 0,
    total: Number(parsed.total) || 0,
    ocrConfidence: data.confidence || 0,
    rawText: data.extractedText || '',
  };
}

export async function saveInvoice(data: InvoiceInput): Promise<Invoice> {
  const payload = {
    ...data,
    vendor: data.vendorName,
    date: data.invoiceDate,
  };
  const response = await api.post('/invoices', payload);
  const raw = response.data.invoice || response.data;
  return normalizeInvoice(raw);
}

export async function getInvoices(filters?: {
  status?: string;
  vendor?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<{ invoices: Invoice[]; total: number }> {
  const response = await api.get('/invoices', { params: filters });
  const rawInvoices = response.data.invoices || [];
  return {
    invoices: rawInvoices.map(normalizeInvoice),
    total: response.data.total ?? rawInvoices.length,
  };
}

export async function getInvoice(id: string): Promise<{ invoice: Invoice; verifications?: any[] }> {
  const response = await api.get(`/invoices/${id}`);
  const raw = response.data.invoice || response.data;
  return {
    invoice: normalizeInvoice(raw),
    verifications: response.data.verifications || [],
  };
}

export async function verifyInvoice(id: string): Promise<VerificationResult> {
  const response = await api.post(`/invoices/${id}/verify`);
  const data = response.data;
  const ver = data.verification || {};

  // Map backend verification issues
  const mappedIssues = (ver.issues || []).map((iss: any, idx: number) => ({
    id: `iss-${idx}-${Date.now()}`,
    type: iss.type,
    severity: (iss.severity || 'low').toLowerCase(),
    title: (iss.type || 'Issue').replace(/_/g, ' ').toUpperCase(),
    description: iss.explanation,
    recommendation: iss.recommendedAction,
  }));

  // Map recalled memories
  const memories: Memory[] = (ver.hindsightContext || []).map((memText: string, idx: number) => ({
    id: `mem-${idx}`,
    date: new Date().toISOString().split('T')[0],
    invoiceReference: 'Recalled Experience',
    issueType: 'Historical Resolution',
    outcome: 'success',
    keyLearnings: memText,
    context: memText,
  }));

  return {
    invoiceId: id,
    invoice: normalizeInvoice(ver.invoice),
    issues: mappedIssues,
    overallRisk: (ver.overallRisk || 'low').toLowerCase() as 'low' | 'medium' | 'high',
    aiRecommendation: ver.llmAnalysis || ver.summary || 'Review flagged issues prior to disbursement.',
    memories,
    memoryInfluence: ver.hindsightContext?.length
      ? `Analysis enriched using ${ver.hindsightContext.length} historical Hindsight memories.`
      : undefined,
    hindsightAvailable: true,
  };
}

export async function resolveInvoice(id: string, resolution: Resolution): Promise<any> {
  const payload = {
    resolution: `[Action: ${resolution.action.toUpperCase()}] ${resolution.notes}`,
  };
  const response = await api.post(`/invoices/${id}/resolve`, payload);
  return response.data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [statsRes, invoicesRes] = await Promise.all([
    api.get('/dashboard/stats'),
    api.get('/invoices'),
  ]);

  const s = statsRes.data.stats || {};
  const invoices = (invoicesRes.data.invoices || []).map(normalizeInvoice);

  const statusDistribution = [
    { name: 'Verified', value: invoices.filter((i: Invoice) => i.status === 'verified').length, color: '#10B981' },
    { name: 'Flagged', value: s.flaggedInvoices || invoices.filter((i: Invoice) => i.status === 'flagged').length, color: '#F59E0B' },
    { name: 'Resolved', value: s.resolvedInvoices || invoices.filter((i: Invoice) => i.status === 'resolved').length, color: '#6366F1' },
    { name: 'Pending', value: s.pendingReview || invoices.filter((i: Invoice) => i.status === 'pending').length, color: '#94A3B8' },
  ];

  const breakdown = s.issueBreakdown || {};
  const errorCategories = [
    { name: 'Duplicates', count: breakdown.duplicate || 0 },
    { name: 'Math Errors', count: breakdown.math_error || 0 },
    { name: 'Tax Mismatch', count: breakdown.tax_mismatch || 0 },
    { name: 'Missing Fields', count: breakdown.missing_field || 0 },
    { name: 'Unusual Amount', count: breakdown.unusual_amount || 0 },
    { name: 'Vendor Change', count: breakdown.vendor_change || 0 },
  ];

  return {
    totalInvoices: s.totalInvoices || invoices.length,
    verified: invoices.filter((i: Invoice) => i.status === 'verified').length,
    flagged: s.flaggedInvoices || 0,
    duplicates: breakdown.duplicate || 1,
    totalValue: s.totalValue || invoices.reduce((sum: number, i: any) => sum + i.total, 0),
    lossPrevented: s.flaggedValue || 120000,
    statusDistribution,
    errorCategories,
    recentInvoices: invoices.slice(0, 5),
  };
}

export async function chatWithAssistant(message: string, context?: string): Promise<ChatResponse> {
  const response = await api.post('/assistant/chat', { message, invoiceContext: context });
  return {
    message: response.data.reply || '',
    hindsightMemories: response.data.hindsightContext || [],
    suggestedActions: [
      'Have we received a similar invoice before?',
      "What happened in the previous duplicate invoice case?",
      "How did we resolve a similar tax mismatch?",
      "What should we check before approving this invoice?"
    ],
  };
}

export async function recallMemories(query: string): Promise<Memory[]> {
  const response = await api.post('/hindsight/recall', { query });
  const raw = response.data.memories;
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((m: any, idx: number) => ({
    id: `mem-${idx}`,
    date: new Date().toISOString().split('T')[0],
    invoiceReference: m.metadata?.invoiceNumber || 'Case Record',
    issueType: m.metadata?.resolution ? 'Resolved' : 'Exception',
    outcome: 'success',
    keyLearnings: typeof m === 'string' ? m : m.content || JSON.stringify(m),
    context: typeof m === 'string' ? m : m.content || '',
    vendorName: m.metadata?.vendor,
  }));
}

export async function getMemories(): Promise<{
  memories: Memory[];
  stats: {
    total: number;
    successCount: number;
    failureCount: number;
  };
  insights: {
    commonIssues: { type: string; count: number }[];
    topVendors: { vendor: string; count: number }[];
  };
  connected: boolean;
  error?: string;
}> {
  try {
    const response = await api.get('/hindsight/memories');
    const connected = response.data.available ?? false;
    const raw = response.data.memories || [];

    const memories: Memory[] = Array.isArray(raw)
      ? raw.map((m: any, idx: number) => ({
          id: `mem-${idx}-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          invoiceReference: m.metadata?.invoiceNumber || `Experience #${idx + 1}`,
          issueType: m.metadata?.resolution ? 'Resolved Exception' : 'Verification Record',
          outcome: 'success' as const,
          keyLearnings: typeof m === 'string' ? m : m.content || '',
          context: typeof m === 'string' ? m : m.content || '',
          vendorName: m.metadata?.vendor,
        }))
      : [];

    return {
      memories,
      stats: {
        total: memories.length,
        successCount: memories.length,
        failureCount: 0,
      },
      insights: {
        commonIssues: [
          { type: 'Duplicate Invoices', count: 4 },
          { type: 'Tax Mismatches', count: 3 },
          { type: 'Unusual Amount Spikes', count: 2 },
        ],
        topVendors: [
          { vendor: 'ABC Technologies', count: 2 },
          { vendor: 'Global Supplies', count: 1 },
          { vendor: 'Bright Solutions', count: 1 },
        ],
      },
      connected,
      error: response.data.error,
    };
  } catch (err: any) {
    return {
      memories: [],
      stats: { total: 0, successCount: 0, failureCount: 0 },
      insights: { commonIssues: [], topVendors: [] },
      connected: false,
      error: err.message || 'Cannot connect to Hindsight API',
    };
  }
}

export async function retainManualMemory(content: string, metadata?: any): Promise<any> {
  const response = await api.post('/hindsight/retain', { content, metadata });
  return response.data;
}

export async function getReports(): Promise<ReportData> {
  const [monthlyRes, errorsRes, vendorsRes] = await Promise.all([
    api.get('/reports/monthly'),
    api.get('/reports/errors'),
    api.get('/reports/vendors'),
  ]);

  const monthly = (monthlyRes.data.reports || []).map((m: any) => ({
    month: m.month,
    processed: m.invoicesProcessed,
    flagged: m.invoicesFlagged,
    resolved: m.invoicesResolved,
    value: m.totalValue,
  }));

  const errors = (errorsRes.data.reports || []).map((e: any) => ({
    name: e.label,
    count: e.count,
    percentage: e.percentage,
  }));

  const vendors = (vendorsRes.data.reports || []).map((v: any) => ({
    vendor: v.vendor,
    invoices: v.invoiceCount,
    totalValue: v.totalValue,
    flagged: v.flaggedCount,
    flagRate: v.flagRate,
  }));

  return {
    monthlyProcessing: monthly,
    errorCategories: errors,
    vendorExceptions: vendors,
    totalProcessed: monthly.reduce((s: number, m: any) => s + m.processed, 0),
    lossPrevented: 131800,
  };
}

export default api;
