// ── Invoice verification engine ──
// Checks for duplicates, math errors, tax calculation mismatches,
// missing fields, unusual amounts, and vendor discrepancies.

import { v4 as uuidv4 } from 'uuid';
import { Invoice, VerificationIssue, VerificationResult, IssueSeverity } from '../types/index.js';
import { store } from '../db/store.js';

export function verifyInvoice(invoice: Invoice): VerificationResult {
  const issues: VerificationIssue[] = [];
  const allInvoices = store.getInvoices();

  // 1. DUPLICATE CHECKS
  // Check exact duplicate invoice number
  const duplicateInvoiceNumber = allInvoices.filter(
    (inv) =>
      inv.id !== invoice.id &&
      inv.invoiceNumber.trim().toLowerCase() === invoice.invoiceNumber.trim().toLowerCase()
  );

  if (duplicateInvoiceNumber.length > 0) {
    const existing = duplicateInvoiceNumber[0];
    const isSameVendor = existing.vendor.trim().toLowerCase() === invoice.vendor.trim().toLowerCase();

    issues.push({
      type: 'duplicate',
      severity: 'High',
      explanation: isSameVendor
        ? `Duplicate invoice detected: Invoice number "${invoice.invoiceNumber}" was previously submitted by the same vendor (${existing.vendor}) on ${existing.date} for ₹${existing.total.toLocaleString()} (Status: ${existing.status}).`
        : `Invoice number collision: Invoice number "${invoice.invoiceNumber}" already exists in the system under vendor "${existing.vendor}" on ${existing.date} for ₹${existing.total.toLocaleString()}.`,
      recommendedAction: isSameVendor
        ? 'Flag for human review. Contact vendor to verify if this is an accidental double submission or re-billing of an unpaid invoice.'
        : 'Verify vendor numbering format and cross-check original purchase orders before approving.',
      details: {
        conflictingInvoiceId: existing.id,
        conflictingVendor: existing.vendor,
        conflictingDate: existing.date,
        conflictingTotal: existing.total,
        conflictingStatus: existing.status,
      },
    });
  } else {
    // Check near-duplicate: same vendor, identical or near-identical amount within 60 days
    const vendorInvoices = allInvoices.filter(
      (inv) =>
        inv.id !== invoice.id &&
        inv.vendor.trim().toLowerCase() === invoice.vendor.trim().toLowerCase()
    );

    const sameAmountMatch = vendorInvoices.find((inv) => Math.abs(inv.total - invoice.total) < 0.01);
    if (sameAmountMatch) {
      issues.push({
        type: 'duplicate',
        severity: 'Medium',
        explanation: `Potential duplicate payment: Vendor "${invoice.vendor}" previously billed the identical amount of ₹${invoice.total.toLocaleString()} on invoice "${sameAmountMatch.invoiceNumber}" dated ${sameAmountMatch.date}.`,
        recommendedAction: 'Check line items and delivery receipts to verify whether this represents a distinct billable order or a duplicate claim.',
        details: {
          matchedInvoiceNumber: sameAmountMatch.invoiceNumber,
          matchedDate: sameAmountMatch.date,
          matchedTotal: sameAmountMatch.total,
        },
      });
    }
  }

  // 2. MATHEMATICAL INTEGRITY CHECKS
  const expectedTotal = invoice.subtotal + invoice.taxAmount;
  const totalDiff = Math.abs(invoice.total - expectedTotal);

  if (totalDiff > 1) { // allow 1 rupee rounding tolerance
    issues.push({
      type: 'math_error',
      severity: 'High',
      explanation: `Mathematical total mismatch: Subtotal (₹${invoice.subtotal.toLocaleString()}) + Tax (₹${invoice.taxAmount.toLocaleString()}) equals ₹${expectedTotal.toLocaleString()}, but the declared total is ₹${invoice.total.toLocaleString()} (Discrepancy: ₹${Math.abs(invoice.total - expectedTotal).toLocaleString()}).`,
      recommendedAction: 'Do not approve until recalculation is validated. Request an amended invoice from the vendor reflecting corrected arithmetic.',
      details: {
        declaredSubtotal: invoice.subtotal,
        declaredTax: invoice.taxAmount,
        expectedTotal,
        declaredTotal: invoice.total,
        discrepancy: totalDiff,
      },
    });
  }

  // 3. TAX CALCULATION MISMATCH
  if (invoice.subtotal > 0 && invoice.taxRate > 0) {
    const calculatedTax = (invoice.subtotal * invoice.taxRate) / 100;
    const taxDiff = Math.abs(invoice.taxAmount - calculatedTax);

    if (taxDiff > 2) { // 2 rupee tolerance for rounding
      issues.push({
        type: 'tax_mismatch',
        severity: 'Medium',
        explanation: `Tax calculation discrepancy: At the indicated rate of ${invoice.taxRate}%, the tax on ₹${invoice.subtotal.toLocaleString()} should be ₹${calculatedTax.toFixed(2)}, but ₹${invoice.taxAmount.toLocaleString()} was entered (Difference: ₹${taxDiff.toFixed(2)}).`,
        recommendedAction: 'Verify applicable GST / VAT slab rates and confirm whether discounts, shipping, or non-taxable line items altered the effective tax base.',
        details: {
          subtotal: invoice.subtotal,
          taxRate: invoice.taxRate,
          expectedTax: calculatedTax,
          declaredTax: invoice.taxAmount,
          difference: taxDiff,
        },
      });
    }
  } else if (invoice.taxRate > 35) {
    issues.push({
      type: 'tax_mismatch',
      severity: 'Medium',
      explanation: `Unusually high tax rate: Declared tax rate is ${invoice.taxRate}%, which exceeds standard business tax brackets (typically 0% - 28%).`,
      recommendedAction: 'Confirm tax classification and statutory GST schedule for this product or service.',
    });
  }

  // 4. MISSING INVOICE DETAILS
  const missingFields: string[] = [];
  if (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '') missingFields.push('Invoice Number');
  if (!invoice.vendor || invoice.vendor.trim() === '') missingFields.push('Vendor Name');
  if (!invoice.date || invoice.date.trim() === '') missingFields.push('Invoice Date');
  if (invoice.total <= 0) missingFields.push('Total Amount');

  if (missingFields.length > 0) {
    issues.push({
      type: 'missing_field',
      severity: missingFields.includes('Invoice Number') || missingFields.includes('Total Amount') ? 'High' : 'Medium',
      explanation: `Required invoice metadata is missing: ${missingFields.join(', ')}.`,
      recommendedAction: 'Require the submitter or vendor to supply the missing information before initiating payment processing.',
      details: { missingFields },
    });
  }

  if (!invoice.dueDate) {
    issues.push({
      type: 'missing_field',
      severity: 'Low',
      explanation: 'No payment due date is specified on this invoice.',
      recommendedAction: 'Default to standard corporate net-30 terms or confirm agreed credit window with purchasing.',
    });
  }

  // 5. UNUSUAL INVOICE AMOUNTS
  // Compare with historical transactions for the same vendor
  const vendorHistory = allInvoices.filter(
    (inv) =>
      inv.id !== invoice.id &&
      inv.vendor.trim().toLowerCase() === invoice.vendor.trim().toLowerCase() &&
      inv.total > 0
  );

  if (vendorHistory.length >= 2) {
    const historicalAmounts = vendorHistory.map((inv) => inv.total);
    const avgAmount = historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length;
    const maxHistorical = Math.max(...historicalAmounts);

    // If current amount is > 3x the average historical invoice or > 2.5x max
    if (invoice.total > avgAmount * 3 && invoice.total > 20000) {
      issues.push({
        type: 'unusual_amount',
        severity: 'High',
        explanation: `Abnormally high invoice amount: This invoice of ₹${invoice.total.toLocaleString()} is ${((invoice.total / avgAmount) * 100 - 100).toFixed(0)}% higher than the historical average (₹${avgAmount.toFixed(0)}) for vendor "${invoice.vendor}" (Previous max: ₹${maxHistorical.toLocaleString()}).`,
        recommendedAction: 'Cross-verify with matching Purchase Order (PO) and obtain departmental manager authorization prior to disbursement.',
        details: {
          currentAmount: invoice.total,
          historicalAverage: Math.round(avgAmount),
          previousMax: maxHistorical,
          sampleCount: vendorHistory.length,
        },
      });
    } else if (invoice.total > avgAmount * 1.8 && invoice.total > 15000) {
      issues.push({
        type: 'unusual_amount',
        severity: 'Medium',
        explanation: `Elevated amount notice: Invoice total of ₹${invoice.total.toLocaleString()} is notably above typical billing of ₹${avgAmount.toFixed(0)} for vendor "${invoice.vendor}".`,
        recommendedAction: 'Check if this invoice includes annual renewals, milestone deliveries, or bulk volume items.',
      });
    }
  }

  // 6. SUSPICIOUS CHANGES IN VENDOR DETAILS
  if (vendorHistory.length > 0 && invoice.vendorGSTIN) {
    const previousGSTINs = vendorHistory
      .map((inv) => inv.vendorGSTIN)
      .filter((g): g is string => !!g && g.trim() !== '');

    if (previousGSTINs.length > 0 && !previousGSTINs.includes(invoice.vendorGSTIN)) {
      issues.push({
        type: 'vendor_change',
        severity: 'High',
        explanation: `Vendor Tax ID mismatch: Vendor "${invoice.vendor}" used GSTIN "${invoice.vendorGSTIN}", which differs from previously registered GSTIN "${previousGSTINs[0]}".`,
        recommendedAction: 'Verify vendor corporate entity updates. Ensure bank beneficiary details correspond to the legitimate legal supplier.',
        details: {
          currentGSTIN: invoice.vendorGSTIN,
          previousGSTIN: previousGSTINs[0],
        },
      });
    }
  }

  // Determine overall risk
  let overallRisk: IssueSeverity | 'None' = 'None';
  if (issues.some((i) => i.severity === 'High')) {
    overallRisk = 'High';
  } else if (issues.some((i) => i.severity === 'Medium')) {
    overallRisk = 'Medium';
  } else if (issues.some((i) => i.severity === 'Low')) {
    overallRisk = 'Low';
  }

  // Generate concise summary
  let summary = '';
  if (issues.length === 0) {
    summary = 'All automated verification checks passed. Invoice is arithmetically sound with no conflicting duplicates detected.';
  } else {
    summary = `Detected ${issues.length} verification issue(s) (${issues.filter((i) => i.severity === 'High').length} High, ${issues.filter((i) => i.severity === 'Medium').length} Medium, ${issues.filter((i) => i.severity === 'Low').length} Low). Requires human review.`;
  }

  return {
    id: uuidv4(),
    invoiceId: invoice.id,
    issues,
    overallRisk,
    summary,
    verifiedAt: new Date().toISOString(),
  };
}
