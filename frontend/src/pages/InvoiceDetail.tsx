import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Building,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '../components/StatusBadge';
import VerificationResults from '../components/VerificationResults';
import { getInvoice } from '../api/client';
import type { Invoice, VerificationResult } from '../types';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getInvoice(id);
        setInvoice(data.invoice);
        setVerifications(data.verifications || []);
      } catch (err) {
        console.error('Failed to load invoice detail', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const formatCurrency = (amount: number) =>
    '₹' + new Intl.NumberFormat('en-IN').format(amount);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-slate-500 text-sm">Invoice not found.</p>
        <button
          onClick={() => navigate('/history')}
          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs"
        >
          Back to History
        </button>
      </div>
    );
  }

  const latestVerification = verifications[verifications.length - 1];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices</span>
        </button>

        <button
          onClick={() => navigate(`/verify/${invoice.id}`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Run Verification & Review</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Internal Record ID: <span className="font-mono text-slate-600">{invoice.id}</span>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block">Total Billed</span>
            <span className="text-3xl font-black text-slate-900">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {/* 2-column info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor Details</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-bold text-slate-800">{invoice.vendorName}</span>
              </div>
              {invoice.vendorGSTIN && (
                <p className="text-xs text-slate-600">
                  GSTIN: <span className="font-mono font-medium text-slate-800">{invoice.vendorGSTIN}</span>
                </p>
              )}
              {invoice.vendorAddress && (
                <p className="text-xs text-slate-500">{invoice.vendorAddress}</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Breakdown</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Date:</span>
                <span className="font-semibold text-slate-700">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Due:</span>
                <span className="font-semibold text-slate-700">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Taxable Subtotal:</span>
                <span className="font-semibold text-slate-700">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax ({invoice.taxRate}%):</span>
                <span className="font-semibold text-slate-700">{formatCurrency(invoice.taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold">
                <span className="text-slate-800">Grand Total:</span>
                <span className="text-indigo-600">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Notes (if any) */}
        {invoice.resolution && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
            <p className="font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              Resolution & Investigation Finding:
            </p>
            <p className="text-emerald-700 leading-relaxed">{invoice.resolution}</p>
            {invoice.resolvedAt && (
              <p className="text-[10px] text-emerald-600">Resolved on: {formatDate(invoice.resolvedAt)}</p>
            )}
          </div>
        )}

        {/* Verification history */}
        {latestVerification && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Verification Outcome History
            </h3>
            <VerificationResults
              issues={latestVerification.issues.map((i: any, idx: number) => ({
                id: `iss-${idx}`,
                type: i.type,
                severity: i.severity.toLowerCase(),
                title: i.type.toUpperCase(),
                description: i.explanation,
                recommendation: i.recommendedAction,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
