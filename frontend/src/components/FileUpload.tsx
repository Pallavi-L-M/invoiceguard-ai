import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onUpload: (file: File) => void;
  loading: boolean;
  fileName?: string;
  error?: string;
}

export default function FileUpload({ onUpload, loading, fileName, error }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/tiff'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid PDF, JPG, or PNG invoice file.');
      return;
    }
    onUpload(file);
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-slate-50/50'
        } ${loading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tiff"
          onChange={handleChange}
          className="hidden"
        />

        {loading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700">Scanning document & extracting invoice fields...</p>
            <p className="text-xs text-slate-400">Running OCR text recognition and metadata extraction</p>
          </div>
        ) : fileName ? (
          <div className="py-4 flex flex-col items-center justify-center space-y-2">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
              <CheckCircle className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-slate-800">{fileName}</p>
            <p className="text-xs text-slate-400">Click or drag a new file to replace</p>
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Upload className="h-7 w-7 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                <span className="text-indigo-600 hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports PDF, JPG, PNG invoices (up to 10MB)</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] text-slate-500 font-medium">
              <FileText className="h-3.5 w-3.5" />
              <span>Automated OCR Field Extraction</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}
    </div>
  );
}
