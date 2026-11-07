// ── In-memory JSON store for MVP ──

import { Invoice, VerificationResult, ActivityEntry } from '../types/index.js';

class Store {
  private invoices: Map<string, Invoice> = new Map();
  private verificationResults: Map<string, VerificationResult[]> = new Map();
  private activities: ActivityEntry[] = [];

  // ── Invoice methods ──

  addInvoice(invoice: Invoice): Invoice {
    this.invoices.set(invoice.id, invoice);
    this.addActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'upload',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      vendor: invoice.vendor,
      description: `Invoice ${invoice.invoiceNumber} from ${invoice.vendor} added`,
      timestamp: new Date().toISOString(),
    });
    return invoice;
  }

  getInvoice(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }

  getInvoices(filters?: {
    status?: string;
    vendor?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Invoice[] {
    let results = Array.from(this.invoices.values());

    if (filters) {
      if (filters.status) {
        results = results.filter((inv) => inv.status === filters.status);
      }
      if (filters.vendor) {
        results = results.filter((inv) =>
          inv.vendor.toLowerCase().includes(filters.vendor!.toLowerCase())
        );
      }
      if (filters.dateFrom) {
        results = results.filter((inv) => inv.date >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        results = results.filter((inv) => inv.date <= filters.dateTo!);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        results = results.filter(
          (inv) =>
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.vendor.toLowerCase().includes(q) ||
            (inv.description && inv.description.toLowerCase().includes(q))
        );
      }
    }

    // Sort by createdAt descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  }

  updateInvoice(id: string, updates: Partial<Invoice>): Invoice | undefined {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;

    const updated: Invoice = {
      ...invoice,
      ...updates,
      id: invoice.id, // prevent id overwrite
      updatedAt: new Date().toISOString(),
    };
    this.invoices.set(id, updated);
    return updated;
  }

  // ── Verification methods ──

  addVerificationResult(result: VerificationResult): VerificationResult {
    const existing = this.verificationResults.get(result.invoiceId) || [];
    existing.push(result);
    this.verificationResults.set(result.invoiceId, existing);

    const invoice = this.invoices.get(result.invoiceId);
    if (invoice) {
      const hasIssues = result.issues.length > 0;
      this.addActivity({
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: hasIssues ? 'flag' : 'verify',
        invoiceId: result.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        vendor: invoice.vendor,
        description: hasIssues
          ? `Invoice ${invoice.invoiceNumber} flagged with ${result.issues.length} issue(s)`
          : `Invoice ${invoice.invoiceNumber} verified — no issues found`,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  getVerificationResults(invoiceId: string): VerificationResult[] {
    return this.verificationResults.get(invoiceId) || [];
  }

  getAllVerificationResults(): VerificationResult[] {
    const all: VerificationResult[] = [];
    for (const results of this.verificationResults.values()) {
      all.push(...results);
    }
    return all;
  }

  // ── Activity methods ──

  addActivity(entry: ActivityEntry): void {
    this.activities.unshift(entry); // newest first
    if (this.activities.length > 200) {
      this.activities = this.activities.slice(0, 200);
    }
  }

  getRecentActivities(limit = 20): ActivityEntry[] {
    return this.activities.slice(0, limit);
  }

  // ── Stats helpers ──

  getInvoicesByVendor(vendor: string): Invoice[] {
    return Array.from(this.invoices.values()).filter(
      (inv) => inv.vendor.toLowerCase() === vendor.toLowerCase()
    );
  }

  getAllVendors(): string[] {
    const vendors = new Set<string>();
    for (const inv of this.invoices.values()) {
      vendors.add(inv.vendor);
    }
    return Array.from(vendors);
  }

  getStats() {
    const invoices = Array.from(this.invoices.values());
    const totalInvoices = invoices.length;
    const pendingReview = invoices.filter((i) => i.status === 'pending').length;
    const flaggedInvoices = invoices.filter((i) => i.status === 'flagged').length;
    const resolvedInvoices = invoices.filter((i) => i.status === 'resolved').length;
    const totalValue = invoices.reduce((sum, i) => sum + i.total, 0);
    const flaggedValue = invoices
      .filter((i) => i.status === 'flagged')
      .reduce((sum, i) => sum + i.total, 0);

    return {
      totalInvoices,
      pendingReview,
      flaggedInvoices,
      resolvedInvoices,
      totalValue,
      flaggedValue,
    };
  }
}

export const store = new Store();
