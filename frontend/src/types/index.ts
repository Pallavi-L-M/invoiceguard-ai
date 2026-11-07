export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  vendor?: string;
  vendorAddress?: string;
  vendorGSTIN?: string;
  invoiceDate: string;
  date?: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  ocrConfidence?: number;
  fileName?: string;
  sourceFile?: string;
  description?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'pending' | 'verified' | 'flagged' | 'duplicate' | 'resolved' | 'rejected';

export interface InvoiceInput {
  invoiceNumber: string;
  vendorName: string;
  vendor?: string;
  invoiceDate: string;
  date?: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  description?: string;
}

export interface ExtractedInvoice {
  id?: string;
  invoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  ocrConfidence: number;
  rawText?: string;
}

export interface VerificationIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation: string;
}

export interface VerificationResult {
  invoiceId: string;
  invoice: Invoice;
  issues: VerificationIssue[];
  overallRisk: 'low' | 'medium' | 'high';
  aiRecommendation: string;
  memories: Memory[];
  memoryInfluence?: string;
  hindsightAvailable: boolean;
}

export interface Memory {
  id: string;
  date: string;
  invoiceReference: string;
  issueType: string;
  outcome: 'success' | 'failure';
  keyLearnings: string;
  context: string;
  vendorName?: string;
}

export interface HindsightResponse {
  memories: Memory[];
  totalCount: number;
  connected: boolean;
}

export interface Resolution {
  action: 'approve' | 'flag' | 'reject';
  notes: string;
}

export interface DashboardStats {
  totalInvoices: number;
  verified: number;
  flagged: number;
  duplicates: number;
  totalValue: number;
  lossPrevented: number;
  statusDistribution: { name: string; value: number; color: string }[];
  errorCategories: { name: string; count: number }[];
  recentInvoices: Invoice[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  hindsightContext?: string[];
}

export interface ChatResponse {
  message: string;
  hindsightMemories?: string[];
  suggestedActions?: string[];
}

export interface ReportData {
  monthlyProcessing: {
    month: string;
    processed: number;
    flagged: number;
    resolved: number;
    value: number;
  }[];
  errorCategories: {
    name: string;
    count: number;
    percentage: number;
  }[];
  vendorExceptions: {
    vendor: string;
    invoices: number;
    totalValue: number;
    flagged: number;
    flagRate: number;
  }[];
  totalProcessed: number;
  lossPrevented: number;
  lossesPrevented?: number;
}
