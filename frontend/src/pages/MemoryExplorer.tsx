import { useState, useEffect } from 'react';
import {
  Brain,
  Search,
  CheckCircle,
  AlertCircle,
  Database,
  Plus,
  RefreshCw,
  Sparkles,
  Info,
  History,
} from 'lucide-react';
import MemoryCard from '../components/MemoryCard';
import { getMemories, recallMemories, retainManualMemory } from '../api/client';
import type { Memory } from '../types';

// These examples mirror the synthetic demonstration invoices shipped with the app.
// They are shown only while Hindsight is offline and are never counted as retained memories.
const demoMemories: Memory[] = [
  {
    id: 'demo-memory-abc',
    date: '2026-10-20',
    invoiceReference: 'INV-1001',
    issueType: 'Approved Invoice',
    outcome: 'success',
    vendorName: 'ABC Technologies',
    context: 'Monthly cloud infrastructure retainer was matched to purchase order PO-8821 and verified as authentic.',
    keyLearnings: 'Confirm the invoice against its purchase order before approving payment.',
  },
  {
    id: 'demo-memory-acme',
    date: '2026-08-25',
    invoiceReference: 'ACM-5511',
    issueType: 'Duplicate Invoice',
    outcome: 'success',
    vendorName: 'Acme Hardware Corp',
    context: 'A repeated server cooling chassis invoice was checked against ACM-5510.',
    keyLearnings: 'Vendor accounting confirmed a duplicate entry; the repeated invoice was voided.',
  },
  {
    id: 'demo-memory-global',
    date: '2026-09-21',
    invoiceReference: 'GLS-8820',
    issueType: 'Tax Mismatch',
    outcome: 'success',
    vendorName: 'Global Supplies',
    context: 'The tax amount on warehouse supplies was lower than the expected 18% calculation.',
    keyLearnings: 'A vendor credit memo corrected the tax discrepancy before payment.',
  },
  {
    id: 'demo-memory-vertex',
    date: '2026-10-14',
    invoiceReference: 'VTX-7719',
    issueType: 'Missing Due Date',
    outcome: 'success',
    vendorName: 'Vertex Software Solutions',
    context: 'The invoice did not include a payment due date.',
    keyLearnings: 'The vendor confirmed net-30 terms before the invoice was resolved.',
  },
];

export default function MemoryExplorer() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState({ total: 0, successCount: 0, failureCount: 0 });
  const [insights, setInsights] = useState<{ commonIssues: any[]; topVendors: any[] }>({
    commonIssues: [],
    topVendors: [],
  });
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Manual retain dialog state
  const [showRetainModal, setShowRetainModal] = useState(false);
  const [retainContent, setRetainContent] = useState('');
  const [retaining, setRetaining] = useState(false);
  const [retainMessage, setRetainMessage] = useState<string | null>(null);

  const showingExamples = !connected && memories.length === 0;
  const visibleMemories = showingExamples
    ? demoMemories.filter((memory) => {
        const query = searchQuery.trim().toLowerCase();
        return !query || `${memory.invoiceReference} ${memory.issueType} ${memory.vendorName} ${memory.context} ${memory.keyLearnings}`.toLowerCase().includes(query);
      })
    : memories;

  const fetchAllMemories = async () => {
    setLoading(true);
    try {
      const data = await getMemories();
      setMemories(data.memories);
      setStats(data.stats);
      setInsights(data.insights);
      setConnected(data.connected);
      setConnectionError(data.error);
    } catch (err: any) {
      setConnected(false);
      setConnectionError(err.message || 'Cannot reach Hindsight server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMemories();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchAllMemories();
      return;
    }
    setSearching(true);
    try {
      const results = await recallMemories(searchQuery.trim());
      setMemories(results);
    } catch (err: any) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  const handleRetainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retainContent.trim()) return;

    setRetaining(true);
    setRetainMessage(null);
    try {
      const result = await retainManualMemory(retainContent.trim(), {
        manualEntry: true,
        retainedAt: new Date().toISOString(),
      });

      if (result.success) {
        setRetainMessage('Experience successfully recorded into Hindsight memory bank!');
        setRetainContent('');
        setTimeout(() => {
          setShowRetainModal(false);
          setRetainMessage(null);
          fetchAllMemories();
        }, 1500);
      } else {
        setRetainMessage(`Retention failed: ${result.error || 'Server error'}`);
      }
    } catch (err: any) {
      setRetainMessage(`Error: ${err.message}`);
    } finally {
      setRetaining(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-purple-200 mb-2 backdrop-blur-sm border border-white/10">
              <Brain className="h-3.5 w-3.5 text-purple-300" />
              <span>Vectorize Hindsight Integration</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Hindsight Persistent Memory Explorer</h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Explore how InvoiceGuard retains experiences, resolutions, and exception patterns across multiple sessions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllMemories}
              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Refresh Memories"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowRetainModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Retain New Experience</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status Notice */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between ${
          connected
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-3">
          {connected ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          )}
          <div>
            <p className="text-xs font-bold">
              {connected
                ? 'Connected to Official Vectorize Hindsight API Server'
                : 'Hindsight Server Connection Notice'}
            </p>
            <p className="text-[11px] opacity-90 mt-0.5">
              {connected
                ? 'Persistent memory bank "invoiceguard" is actively receiving and recalling experiences.'
                : connectionError ||
                  'Hindsight daemon is expected at http://localhost:8888. When running, memories persist across all restarts.'}
            </p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            connected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {connected ? 'Active' : 'Offline Mode'}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">Total Memories Retained</span>
          <span className="text-2xl font-black text-slate-800">{stats.total}</span>
          <p className="text-[10px] text-slate-400 mt-1">Cross-session experiences</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">Successful Resolutions</span>
          <span className="text-2xl font-black text-emerald-600">{stats.successCount}</span>
          <p className="text-[10px] text-slate-400 mt-1">Confirmed solutions</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">Memory Bank ID</span>
          <span className="text-base font-bold font-mono text-purple-700">invoiceguard</span>
          <p className="text-[10px] text-slate-400 mt-1">Dedicated AP bank</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 block mb-1">Learning Model</span>
          <span className="text-base font-bold text-slate-800">Vectorize Hindsight</span>
          <p className="text-[10px] text-slate-400 mt-1">Retain / Recall / Reflect</p>
        </div>
      </div>

      {/* Semantic Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query Hindsight semantic memory (e.g. 'duplicate ABC Technologies' or 'tax mismatch')..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {searching ? 'Querying...' : 'Recall'}
          </button>
        </form>
      </div>

      {/* Memories List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="h-4 w-4 text-slate-500" />
            {showingExamples ? 'Sample Experiences (Demo Examples)' : 'Retained Experiences & Case Memories'}
          </h2>
          <span className="text-xs text-slate-400">
            {showingExamples ? `${visibleMemories.length} demo example(s) · not retained` : `${memories.length} item(s) retrieved`}
          </span>
        </div>

        {visibleMemories.length > 0 ? (
          <div className="space-y-3">
            {visibleMemories.map((mem) => (
              <div key={mem.id} className="relative">
                {showingExamples && (
                  <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">
                    Demo example
                  </span>
                )}
                <MemoryCard memory={mem} />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Brain className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">{showingExamples ? 'No matching demo examples' : 'No Memories Found'}</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {showingExamples
                ? 'Clear the search to see the sample cases. Real memories appear after Hindsight is connected and an invoice decision is retained.'
                : 'Verify an invoice in InvoiceGuard and click "Confirm Decision & Retain in Hindsight" to store your first experience.'}
            </p>
          </div>
        )}
      </div>

      {/* Retain Experience Modal */}
      {showRetainModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Retain Experience in Hindsight
              </h3>
              <button
                onClick={() => setShowRetainModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter an accounts payable exception, vendor nuance, or policy rule to commit to Hindsight's long-term memory bank.
            </p>

            <form onSubmit={handleRetainSubmit} className="space-y-4">
              <textarea
                rows={4}
                required
                value={retainContent}
                onChange={(e) => setRetainContent(e.target.value)}
                placeholder="e.g. Vendor ABC Technologies previously submitted invoice INV-1001 twice due to automated re-billing glitch. Verified authentic invoice was already settled."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />

              {retainMessage && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    retainMessage.includes('successfully')
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {retainMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRetainModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={retaining}
                  className="px-5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {retaining ? 'Retaining...' : 'Save to Hindsight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
