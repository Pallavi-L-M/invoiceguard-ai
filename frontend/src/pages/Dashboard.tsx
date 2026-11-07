import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Copy,
  DollarSign,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Brain,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatCard from '../components/StatCard';
import InvoiceTable from '../components/InvoiceTable';
import { getDashboardStats } from '../api/client';
import type { DashboardStats } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading InvoiceGuard dashboard...</p>
        </div>
      </div>
    );
  }

  const formatRupee = (val: number) => '₹' + new Intl.NumberFormat('en-IN').format(val);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-navy-900 via-indigo-950 to-purple-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-purple-200 mb-2.5 backdrop-blur-sm border border-white/10">
              <Brain className="h-3.5 w-3.5 text-purple-300" />
              <span>Hindsight Persistent Memory Active</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">InvoiceGuard AI Overview</h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              Autonomous accounts payable verification with cross-session experience memory. Recalls past duplicate resolutions, vendor anomalies, and tax corrections.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Refresh Stats"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Verify New Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards Grid (6 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={FileText}
          label="Total Invoices"
          value={stats?.totalInvoices || 0}
          color="navy"
        />
        <StatCard
          icon={CheckCircle}
          label="Verified Legitimate"
          value={stats?.verified || 0}
          color="emerald"
        />
        <StatCard
          icon={AlertTriangle}
          label="Flagged for Review"
          value={stats?.flagged || 0}
          color="amber"
        />
        <StatCard
          icon={Copy}
          label="Duplicates Detected"
          value={stats?.duplicates || 0}
          color="rose"
        />
        <StatCard
          icon={DollarSign}
          label="Total Invoice Volume"
          value={formatRupee(stats?.totalValue || 0)}
          color="purple"
        />
        <StatCard
          icon={ShieldAlert}
          label="Loss Prevented"
          value={formatRupee(stats?.lossPrevented || 0)}
          color="emerald"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Invoice Status Distribution</h2>
              <p className="text-xs text-slate-500">Live breakdown of processed accounts payable</p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Real-time
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {stats?.statusDistribution && stats.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} Invoices`, 'Count']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">No invoice records to chart</p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-slate-100">
            {stats?.statusDistribution?.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}:</span>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Categories Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Detected Anomaly Categories</h2>
              <p className="text-xs text-slate-500">Frequency of flags identified by verification engine</p>
            </div>
            <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
              Automated Audit
            </span>
          </div>

          <div className="h-64">
            {stats?.errorCategories && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.errorCategories} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={100} />
                  <Tooltip
                    formatter={(value: any) => [`${value} Issues`, 'Detected']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              High-frequency risks auto-prompt verification against <span className="font-semibold text-slate-700">Hindsight historical banks</span>
            </p>
          </div>
        </div>
      </div>

      {/* Recent Invoice Activity */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Recent Invoice Activity</h2>
            <p className="text-xs text-slate-500">Latest accounts payable submissions and verification status</p>
          </div>
          <button
            onClick={() => navigate('/history')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
          >
            <span>View All Invoices</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <InvoiceTable invoices={stats?.recentInvoices || []} compact={true} />
      </div>
    </div>
  );
}
