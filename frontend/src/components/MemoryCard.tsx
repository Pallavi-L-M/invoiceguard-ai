import { Brain, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Memory } from '../types';

interface MemoryCardProps {
  memory: Memory;
}

export default function MemoryCard({ memory }: MemoryCardProps) {
  const isSuccess = memory.outcome === 'success';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow animate-fade-in">
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}
        >
          <Brain className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-slate-800">
              {memory.invoiceReference}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                isSuccess
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {isSuccess ? (
                <CheckCircle className="h-2.5 w-2.5" />
              ) : (
                <XCircle className="h-2.5 w-2.5" />
              )}
              {isSuccess ? 'Success' : 'Failure'}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
              {memory.issueType}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            {(() => {
              try {
                return format(new Date(memory.date), 'dd MMM yyyy');
              } catch {
                return memory.date;
              }
            })()}
            {memory.vendorName && ` · ${memory.vendorName}`}
          </p>
          <p className="text-sm text-slate-600 mb-2">{memory.context}</p>
          <div className="bg-indigo-50 rounded-lg p-2.5 flex items-start gap-2">
            <BookOpen className="h-3.5 w-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-700">
              <span className="font-medium">Key Learning: </span>
              {memory.keyLearnings}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
