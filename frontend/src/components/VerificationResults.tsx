import {
  AlertTriangle,
  Copy,
  Calculator,
  FileQuestion,
  DollarSign,
  Calendar,
  Building,
} from 'lucide-react';
import type { VerificationIssue } from '../types';

interface VerificationResultsProps {
  issues: VerificationIssue[];
}

const typeConfig: Record<string, { icon: typeof AlertTriangle; label: string; color: string }> = {
  duplicate: { icon: Copy, label: 'Duplicate', color: 'text-rose-500' },
  tax_mismatch: { icon: Calculator, label: 'Tax Mismatch', color: 'text-amber-500' },
  missing_fields: { icon: FileQuestion, label: 'Missing Fields', color: 'text-blue-500' },
  unusual_amount: { icon: DollarSign, label: 'Unusual Amount', color: 'text-purple-500' },
  date_issue: { icon: Calendar, label: 'Date Issue', color: 'text-orange-500' },
  vendor_issue: { icon: Building, label: 'Vendor Issue', color: 'text-indigo-500' },
};

const severityConfig: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Low' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Medium' },
  high: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'High' },
};

export default function VerificationResults({ issues }: VerificationResultsProps) {
  if (issues.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
          <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-emerald-800">All Checks Passed</h3>
        <p className="text-xs text-emerald-600 mt-1">No issues were found with this invoice.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => {
        const typeConf = typeConfig[issue.type] || typeConfig.missing_fields;
        const sevConf = severityConfig[issue.severity] || severityConfig.low;
        const IconComp = typeConf.icon;

        return (
          <div
            key={issue.id}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-slate-50 ${typeConf.color}`}>
                <IconComp className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold text-slate-800">{issue.title}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${sevConf.bg} ${sevConf.text}`}
                  >
                    {sevConf.label}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                    {typeConf.label}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{issue.description}</p>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Recommended: </span>
                    {issue.recommendation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
