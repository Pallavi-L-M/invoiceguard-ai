import { type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: number; isUp: boolean };
  color: string;
}

export default function StatCard({ icon: Icon, label, value, trend, color }: StatCardProps) {
  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: 'border-l-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    amber: { border: 'border-l-amber-500', bg: 'bg-amber-50', text: 'text-amber-600' },
    red: { border: 'border-l-rose-500', bg: 'bg-rose-50', text: 'text-rose-600' },
    indigo: { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    purple: { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 ${c.border} p-5 hover:shadow-md transition-shadow duration-200 animate-slide-up`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 animate-counter">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend.value}%</span>
              <span className="text-slate-400">vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${c.bg}`}>
          <Icon className={`h-5 w-5 ${c.text}`} />
        </div>
      </div>
    </div>
  );
}
