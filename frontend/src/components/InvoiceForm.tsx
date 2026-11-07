import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRight, Save } from 'lucide-react';
import type { InvoiceInput } from '../types';

interface InvoiceFormProps {
  initialValues?: Partial<InvoiceInput>;
  onSubmit: (data: InvoiceInput) => void;
  loading?: boolean;
  ocrConfidence?: number;
}

export default function InvoiceForm({
  initialValues,
  onSubmit,
  loading = false,
  ocrConfidence,
}: InvoiceFormProps) {
  const [formData, setFormData] = useState<InvoiceInput>({
    invoiceNumber: '',
    vendorName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    subtotal: 0,
    taxRate: 18,
    taxAmount: 0,
    total: 0,
  });

  useEffect(() => {
    if (initialValues) {
      setFormData((prev) => ({
        ...prev,
        ...initialValues,
      }));
    }
  }, [initialValues]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value,
    }));
  };

  const handleAutoCalcTax = () => {
    const calculatedTax = Math.round(((formData.subtotal * formData.taxRate) / 100) * 100) / 100;
    const calculatedTotal = Math.round((formData.subtotal + calculatedTax) * 100) / 100;
    setFormData((prev) => ({
      ...prev,
      taxAmount: calculatedTax,
      total: calculatedTotal,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Invoice Information</h3>
          <p className="text-xs text-slate-500">Review or adjust the extracted invoice details</p>
        </div>
        {ocrConfidence !== undefined && ocrConfidence > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            OCR Confidence: {Math.round(ocrConfidence * 100)}%
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Invoice Number *
          </label>
          <input
            type="text"
            name="invoiceNumber"
            required
            value={formData.invoiceNumber}
            onChange={handleChange}
            placeholder="e.g. INV-2026-001"
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Vendor Name *
          </label>
          <input
            type="text"
            name="vendorName"
            required
            value={formData.vendorName}
            onChange={handleChange}
            placeholder="e.g. Acme Tech Solutions"
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Invoice Date *
          </label>
          <input
            type="date"
            name="invoiceDate"
            required
            value={formData.invoiceDate}
            onChange={handleChange}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Payment Due Date
          </label>
          <input
            type="date"
            name="dueDate"
            value={formData.dueDate || ''}
            onChange={handleChange}
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-700">Financial Breakdown (INR ₹)</span>
          <button
            type="button"
            onClick={handleAutoCalcTax}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer"
          >
            <Calculator className="h-3.5 w-3.5" />
            Auto-calculate Total from Subtotal & Tax
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Subtotal (₹)</label>
            <input
              type="number"
              step="any"
              name="subtotal"
              value={formData.subtotal || ''}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              step="any"
              name="taxRate"
              value={formData.taxRate || ''}
              onChange={handleChange}
              placeholder="18"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Tax Amount (₹)</label>
            <input
              type="number"
              step="any"
              name="taxAmount"
              value={formData.taxAmount || ''}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-800 mb-1">Total (₹) *</label>
            <input
              type="number"
              step="any"
              name="total"
              required
              value={formData.total || ''}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm font-bold text-slate-900 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>Saving & Verifying...</>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save & Run AI Verification</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
