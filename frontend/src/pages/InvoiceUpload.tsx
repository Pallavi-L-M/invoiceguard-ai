import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, CheckCircle2, Download } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import InvoiceForm from '../components/InvoiceForm';
import { uploadInvoice, saveInvoice } from '../api/client';
import type { InvoiceInput } from '../types';

export default function InvoiceUpload() {
  const navigate = useNavigate();
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>();
  const [uploadError, setUploadError] = useState<string>();
  const [ocrConfidence, setOcrConfidence] = useState<number>();
  const [formValues, setFormValues] = useState<Partial<InvoiceInput>>({
    invoiceNumber: '',
    vendorName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    subtotal: 0,
    taxRate: 18,
    taxAmount: 0,
    total: 0,
  });

  const handleFileUpload = async (file: File) => {
    setOcrLoading(true);
    setUploadError(undefined);
    setUploadedFileName(file.name);
    setOcrConfidence(undefined);
    setFormValues({
      invoiceNumber: '',
      vendorName: '',
      invoiceDate: '',
      dueDate: '',
      subtotal: 0,
      taxRate: 18,
      taxAmount: 0,
      total: 0,
    });

    try {
      const extracted = await uploadInvoice(file);
      setOcrConfidence(extracted.ocrConfidence);
      setFormValues({
        invoiceNumber: extracted.invoiceNumber,
        vendorName: extracted.vendorName,
        invoiceDate: extracted.invoiceDate,
        dueDate: extracted.dueDate,
        subtotal: extracted.subtotal,
        taxRate: extracted.taxRate,
        taxAmount: extracted.taxAmount,
        total: extracted.total,
      });
    } catch (err: any) {
      setUploadError(err.message || 'OCR document extraction failed. Please enter details manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFormSubmit = async (data: InvoiceInput) => {
    setSaveLoading(true);
    try {
      const created = await saveInvoice(data);
      // Navigate to verification page for this invoice
      navigate(`/verify/${created.id}`);
    } catch (err: any) {
      alert('Failed to save invoice: ' + (err.message || 'Unknown error'));
    } finally {
      setSaveLoading(false);
    }
  };

  // Demo Case Fillers
  const loadDemoCase = (caseNum: 1 | 2 | 3 | 4) => {
    if (caseNum === 1) {
      // Case 1: Duplicate invoice
      setFormValues({
        invoiceNumber: 'INV-1001',
        vendorName: 'ABC Technologies',
        invoiceDate: '2026-11-06',
        dueDate: '2026-12-06',
        subtotal: 21186,
        taxRate: 18,
        taxAmount: 3814,
        total: 25000,
      });
      setUploadedFileName('Case_1_ABC_Technologies_Duplicate_INV-1001.pdf');
      setOcrConfidence(0.98);
      setUploadError(undefined);
    } else if (caseNum === 2) {
      // Case 2: Tax calculation mismatch
      setFormValues({
        invoiceNumber: 'INV-1002',
        vendorName: 'Global Supplies',
        invoiceDate: '2026-11-06',
        dueDate: '2026-11-30',
        subtotal: 10000,
        taxRate: 10,
        taxAmount: 1000,
        total: 11800, // Should be 11,000! Discrepancy of 800
      });
      setUploadedFileName('Case_2_Global_Supplies_Tax_Mismatch_INV-1002.pdf');
      setOcrConfidence(0.95);
      setUploadError(undefined);
    } else if (caseNum === 3) {
      // Case 3: Unusual high amount
      setFormValues({
        invoiceNumber: 'INV-1003',
        vendorName: 'Bright Solutions',
        invoiceDate: '2026-11-06',
        dueDate: '2026-12-06',
        subtotal: 80508,
        taxRate: 18,
        taxAmount: 14492,
        total: 95000, // Baseline for Bright Solutions is ~12k-14k!
      });
      setUploadedFileName('Case_3_Bright_Solutions_Unusual_Spike_INV-1003.pdf');
      setOcrConfidence(0.97);
      setUploadError(undefined);
    } else if (caseNum === 4) {
      // Case 4: Clean compliant invoice
      setFormValues({
        invoiceNumber: 'APX-9940',
        vendorName: 'Apex Logistics Ltd',
        invoiceDate: '2026-11-06',
        dueDate: '2026-12-06',
        subtotal: 32000,
        taxRate: 12,
        taxAmount: 3840,
        total: 35840,
      });
      setUploadedFileName('Case_4_Apex_Logistics_Clean_Verified_APX-9940.pdf');
      setOcrConfidence(0.99);
      setUploadError(undefined);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Upload & Process Invoice</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Extract text via automated OCR, upload sample test PDF files, or auto-fill hackathon cases
        </p>
      </div>

      {/* Sample PDF Documents Download & Quick-Fill Bar */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-900">1-Click Auto-Fill Demo Cases:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadDemoCase(1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-300 hover:border-indigo-500 text-xs font-semibold text-slate-800 hover:text-indigo-600 shadow-xs transition-all cursor-pointer"
            >
              Case 1: Duplicate (ABC Tech ₹25k)
            </button>
            <button
              onClick={() => loadDemoCase(2)}
              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-300 hover:border-indigo-500 text-xs font-semibold text-slate-800 hover:text-indigo-600 shadow-xs transition-all cursor-pointer"
            >
              Case 2: Tax Mismatch (Global Supplies)
            </button>
            <button
              onClick={() => loadDemoCase(3)}
              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-300 hover:border-indigo-500 text-xs font-semibold text-slate-800 hover:text-indigo-600 shadow-xs transition-all cursor-pointer"
            >
              Case 3: Spike (Bright Solutions ₹95k)
            </button>
            <button
              onClick={() => loadDemoCase(4)}
              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-300 hover:border-indigo-500 text-xs font-semibold text-slate-800 hover:text-indigo-600 shadow-xs transition-all cursor-pointer"
            >
              Case 4: Verified Clean (Apex Logistics)
            </button>
          </div>
        </div>

        {/* Downloadable PDF Samples */}
        <div className="pt-2 border-t border-indigo-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-indigo-600" />
            Download Sample Invoice Documents to test Drag & Drop:
          </span>
          <div className="flex flex-wrap gap-2">
            <a
              href="/samples/Case_1_ABC_Technologies_Duplicate_INV-1001.pdf"
              download="Case_1_ABC_Technologies_Duplicate_INV-1001.pdf"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-indigo-200 hover:border-indigo-400 font-medium transition-colors"
            >
              <FileText className="h-3 w-3 text-indigo-500" />
              Case 1 PDF
            </a>
            <a
              href="/samples/Case_2_Global_Supplies_Tax_Mismatch_INV-1002.pdf"
              download="Case_2_Global_Supplies_Tax_Mismatch_INV-1002.pdf"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-indigo-200 hover:border-indigo-400 font-medium transition-colors"
            >
              <FileText className="h-3 w-3 text-indigo-500" />
              Case 2 PDF
            </a>
            <a
              href="/samples/Case_3_Bright_Solutions_Unusual_Spike_INV-1003.pdf"
              download="Case_3_Bright_Solutions_Unusual_Spike_INV-1003.pdf"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-indigo-200 hover:border-indigo-400 font-medium transition-colors"
            >
              <FileText className="h-3 w-3 text-indigo-500" />
              Case 3 PDF
            </a>
            <a
              href="/samples/Case_4_Apex_Logistics_Clean_Verified_APX-9940.pdf"
              download="Case_4_Apex_Logistics_Clean_Verified_APX-9940.pdf"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-indigo-200 hover:border-indigo-400 font-medium transition-colors"
            >
              <FileText className="h-3 w-3 text-indigo-500" />
              Case 4 PDF
            </a>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Upload on left, form on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-1">Invoice Document Upload</h2>
            <p className="text-xs text-slate-500 mb-4">
              Select an invoice image or PDF to extract details using Optical Character Recognition.
            </p>
            <FileUpload
              onUpload={handleFileUpload}
              loading={ocrLoading}
              fileName={uploadedFileName}
              error={uploadError}
            />
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Automated Verification Flow
            </h3>
            <ul className="text-xs text-slate-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">1.</span>
                <span>OCR extracts vendor, amounts, dates, and invoice identifier.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">2.</span>
                <span>System performs mathematical verification and duplicate cross-checks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">3.</span>
                <span>Hindsight is queried to recall past decisions & exceptions.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-indigo-600">4.</span>
                <span>Resolving the case stores your decision back into long-term memory.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Editable Form */}
        <div className="lg:col-span-7">
          <InvoiceForm
            initialValues={formValues}
            onSubmit={handleFormSubmit}
            loading={saveLoading}
            ocrConfidence={ocrConfidence}
          />
        </div>
      </div>
    </div>
  );
}
