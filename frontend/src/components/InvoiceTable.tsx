import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Eye, MoreHorizontal } from 'lucide-react';
import type { Invoice } from '../types';
import StatusBadge from './StatusBadge';

interface InvoiceTableProps {
  invoices: Invoice[];
  compact?: boolean;
  onRowClick?: (invoice: Invoice) => void;
}

function formatCurrency(amount: number): string {
  return '₹' + new Intl.NumberFormat('en-IN').format(amount);
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'dd MMM yyyy');
  } catch {
    return dateStr;
  }
}

export default function InvoiceTable({ invoices, compact = false, onRowClick }: InvoiceTableProps) {
  const navigate = useNavigate();

  const handleClick = (invoice: Invoice) => {
    if (onRowClick) {
      onRowClick(invoice);
    } else {
      navigate(`/invoice/${invoice.id}`);
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <p className="text-slate-400 text-sm">No invoices found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                Invoice #
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                Vendor
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                Amount
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                Status
              </th>
              {!compact && (
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                onClick={() => handleClick(invoice)}
                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
              >
                <td className="px-5 py-3.5">
                  <span className="text-sm font-semibold text-slate-800">{invoice.invoiceNumber}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-slate-600">{invoice.vendorName}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-medium text-slate-800">{formatCurrency(invoice.total)}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-slate-500">{formatDate(invoice.invoiceDate)}</span>
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={invoice.status} />
                </td>
                {!compact && (
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/invoice/${invoice.id}`);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-accent-500 hover:bg-accent-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
