// ── TypeScript interfaces for InvoiceGuard AI ──

export type InvoiceStatus = 'pending' | 'verified' | 'flagged' | 'resolved' | 'rejected';
export type IssueSeverity = 'Low' | 'Medium' | 'High';
export type IssueType =
  | 'duplicate'
  | 'math_error'
  | 'tax_mismatch'
  | 'missing_field'
  | 'unusual_amount'
  | 'vendor_change';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendor: string;
  vendorAddress?: string;
  vendorGSTIN?: string;
  date: string;            // ISO date string
  dueDate?: string;
  subtotal: number;
  taxRate: number;          // percentage, e.g. 18
  taxAmount: number;
  total: number;
  currency: string;
  description?: string;
  lineItems?: LineItem[];
  status: InvoiceStatus;
  ocrConfidence?: number;   // 0-1
  sourceFile?: string;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface VerificationIssue {
  type: IssueType;
  severity: IssueSeverity;
  explanation: string;
  recommendedAction: string;
  details?: Record<string, unknown>;
}

export interface VerificationResult {
  id: string;
  invoiceId: string;
  issues: VerificationIssue[];
  overallRisk: IssueSeverity | 'None';
  summary: string;
  hindsightContext?: string[];
  llmAnalysis?: string;
  verifiedAt: string;
}

export interface HindsightMemory {
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  invoiceContext?: Invoice | null;
}

export interface DashboardStats {
  totalInvoices: number;
  pendingReview: number;
  flaggedInvoices: number;
  resolvedInvoices: number;
  totalValue: number;
  flaggedValue: number;
  issueBreakdown: Record<IssueType, number>;
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  type: 'upload' | 'verify' | 'resolve' | 'flag';
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  description: string;
  timestamp: string;
}

export interface MonthlyReport {
  month: string;
  invoicesProcessed: number;
  invoicesFlagged: number;
  invoicesResolved: number;
  totalValue: number;
  flaggedValue: number;
}

export interface ErrorCategoryReport {
  category: IssueType;
  label: string;
  count: number;
  percentage: number;
}

export interface VendorReport {
  vendor: string;
  invoiceCount: number;
  totalValue: number;
  averageValue: number;
  flaggedCount: number;
  flagRate: number;
}

export interface OCRResult {
  success: boolean;
  extractedText: string;
  parsedData: Partial<Invoice>;
  confidence: number;
  error?: string;
}

export interface HindsightResponse {
  available: boolean;
  data?: unknown;
  error?: string;
}
