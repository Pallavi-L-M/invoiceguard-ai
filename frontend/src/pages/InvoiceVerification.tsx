import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Brain,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Clock,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import VerificationResults from '../components/VerificationResults';
import MemoryCard from '../components/MemoryCard';
import StatusBadge from '../components/StatusBadge';
import { getInvoice, verifyInvoice, resolveInvoice } from '../api/client';
import type { Invoice, VerificationResult } from '../types';

export default function InvoiceVerification() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolutionAction, setResolutionAction] = useState<'approve' | 'flag' | 'reject'>('approve');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolveSuccess, setResolveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadInvoiceAndVerify(id);
  }, [id]);

  const loadInvoiceAndVerify = async (invoiceId: string) => {
    setLoading(true);
    try {
      const data = await getInvoice(invoiceId);
      setInvoice(data.invoice);

      // Trigger verification
      setVerifying(true);
      const result = await verifyInvoice(invoiceId);
      setVerification(result);
    } catch (err: any) {
      console.error('Error verifying invoice:', err);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !resolutionNotes.trim()) {
      alert('Please enter resolution notes explaining your decision.');
      return;
    }

    setResolving(true);
    try {
      const res = await resolveInvoice(id, {
        action: resolutionAction,
        notes: resolutionNotes,
      });

      let msg = `Case resolved as ${resolutionAction.toUpperCase()}.`;
      if (res.hindsight?.stored) {
        msg += ' Successfully stored this experience in Hindsight persistent memory.';
      } else if (res.hindsight?.error) {
        msg += ` Note: Hindsight memory retention reported: ${res.hindsight.error}`;
      }
      setResolveSuccess(msg);

      // Refresh invoice status
      const updated = await getInvoice(id);
      setInvoice(updated.invoice);
    } catch (err: any) {
      alert('Failed to resolve invoice: ' + err.message);
    } finally {
      setResolving(false);
    }
  };

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

  if (loading || verifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        <div className="text-center">
          <h2 className="text-base font-bold text-slate-800">Running AI Verification Engine...</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md">
            Validating arithmetic integrity, detecting duplicates, checking GST compliance, and querying Hindsight memory bank for past resolutions.
          </p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Invoice Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested invoice ID does not exist.</p>
        <button
          onClick={() => navigate('/history')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Return to History
        </button>
      </div>
    );
  }

  const riskColor =
    verification?.overallRisk === 'high'
      ? 'bg-rose-50 border-rose-200 text-rose-700'
      : verification?.overallRisk === 'medium'
      ? 'bg-amber-50 border-amber-200 text-amber-700'
      : 'bg-emerald-50 border-emerald-200 text-emerald-700';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status} />
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border uppercase ${riskColor}`}
              >
                Risk: {verification?.overallRisk || 'Low'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Vendor: <span className="font-semibold text-slate-800">{invoice.vendorName}</span></p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-xs text-slate-400">Total Invoice Amount</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(invoice.total)}</p>
          </div>
        </div>

        {/* Invoice Key Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Invoice Date</span>
            <span className="font-semibold text-slate-700">{formatDate(invoice.invoiceDate)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Payment Due Date</span>
            <span className="font-semibold text-slate-700">{formatDate(invoice.dueDate)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Subtotal</span>
            <span className="font-semibold text-slate-700">{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Tax ({invoice.taxRate}%)</span>
            <span className="font-semibold text-slate-700">{formatCurrency(invoice.taxAmount)}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Verification Issues, Right = Hindsight Memories & Resolution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Verification Results */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Verification Inspection</h2>
                <p className="text-xs text-slate-500">
                  {verification?.issues.length
                    ? `${verification.issues.length} issue(s) flagged for compliance review`
                    : 'All mathematical and compliance checks cleared'}
                </p>
              </div>
            </div>

            <VerificationResults issues={verification?.issues || []} />
          </div>

          {/* AI Recommendation Box */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">AI Auditor Assessment</h3>
            </div>
            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-white/5 rounded-lg p-4 border border-white/10">
              {verification?.aiRecommendation}
            </div>
          </div>
        </div>

        {/* Right Column: Hindsight Memory Bank & Human Resolution */}
        <div className="lg:col-span-5 space-y-6">
          {/* Hindsight Persistent Memory Recalled */}
          <div className="bg-white rounded-xl border border-indigo-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">Hindsight Memory Recall</h2>
              </div>
              <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Vectorize Hindsight
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Experiences retrieved from persistent memory bank for similar vendor or invoice anomalies:
            </p>

            {verification?.memories && verification.memories.length > 0 ? (
              <div className="space-y-3">
                {verification.memories.map((mem) => (
                  <MemoryCard key={mem.id} memory={mem} />
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <Brain className="h-8 w-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-600">No Prior Historical Cases Recalled</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Once you resolve this invoice, its decision and lessons will be retained in Hindsight for future encounters.
                </p>
              </div>
            )}

            {verification?.memoryInfluence && (
              <div className="mt-4 p-3 bg-purple-50/70 border border-purple-200 rounded-lg text-xs text-purple-800">
                <p className="font-semibold flex items-center gap-1.5 mb-0.5">
                  <Info className="h-3.5 w-3.5 text-purple-600" />
                  Memory Influence on Recommendation:
                </p>
                <p className="text-[11px] text-purple-700">{verification.memoryInfluence}</p>
              </div>
            )}
          </div>

          {/* Accountant Decision & Retention in Hindsight */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Human Investigation & Decision</h3>
            <p className="text-xs text-slate-500 mb-4">
              Select resolution action. Your investigation outcome will be retained in Hindsight to train future decisions.
            </p>

            {resolveSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-xs font-bold">Investigation Complete</p>
                </div>
                <p className="text-xs text-emerald-700">{resolveSuccess}</p>
                <button
                  onClick={() => navigate('/history')}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Return to Invoice History
                </button>
              </div>
            ) : (
              <form onSubmit={handleResolve} className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionAction('approve')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      resolutionAction === 'approve'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionAction('flag')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      resolutionAction === 'flag'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Hold Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setResolutionAction('reject')}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      resolutionAction === 'reject'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Investigation Findings & Resolution Notes *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="e.g. Contacted vendor ABC Technologies; confirmed duplicate submission of previous invoice INV-1001. Marked as rejected duplicate."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resolving}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {resolving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Retaining in Hindsight...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Confirm Decision & Retain in Hindsight
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
