import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { ImportJob } from '../types';
import { formatDate } from '../utils/formatters';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  FileCheck,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';

export const ImportCenterPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetType, setDatasetType] = useState<'PURCHASE_REGISTER' | 'GSTR_2B'>('PURCHASE_REGISTER');
  const [previewData, setPreviewData] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [errorModalJob, setErrorModalJob] = useState<ImportJob | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchJobs = async () => {
    try {
      const res = await ApiService.imports.getJobs();
      setJobs(res.data.jobs || []);
    } catch (err) {
      console.error('Failed to load import jobs', err);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewData(null);
      setSuccessMessage('');

      // Preview automatically
      const formData = new FormData();
      formData.append('file', file);
      setPreviewing(true);
      try {
        const res = await ApiService.imports.preview(formData);
        setPreviewData(res.data);
        setColumnMapping(res.data.suggestedMapping || {});
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to inspect file');
      } finally {
        setPreviewing(false);
      }
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setSuccessMessage('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('datasetType', datasetType);
      formData.append('columnMapping', JSON.stringify(columnMapping));

      const res = await ApiService.imports.execute(formData);
      setSuccessMessage(res.data.message);
      setSelectedFile(null);
      setPreviewData(null);
      fetchJobs();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Import execution failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          GST Data Import Center
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Upload Purchase Registers and GSTR-2B datasets in CSV or Excel format with schema validation & column mapping
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Upload & Mapping Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: File Uploader */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Step 1: Select Dataset & File
          </h3>

          {/* Dataset Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Target Dataset</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDatasetType('PURCHASE_REGISTER')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  datasetType === 'PURCHASE_REGISTER'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-300 font-semibold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs">Purchase Register</div>
                <div className="text-[10px] text-slate-400">Internal Books (ERP)</div>
              </button>

              <button
                type="button"
                onClick={() => setDatasetType('GSTR_2B')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  datasetType === 'GSTR_2B'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-300 font-semibold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs">GSTR-2B Statement</div>
                <div className="text-[10px] text-slate-400">Supplier Filed ITC</div>
              </button>
            </div>
          </div>

          {/* Drag & Drop Upload Input */}
          <div className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-xl p-6 text-center transition-all bg-slate-900/40 relative">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-slate-800/80 text-brand-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {selectedFile ? selectedFile.name : 'Click or drag GST CSV or Excel file here'}
              </div>
              <p className="text-[11px] text-slate-400">
                Supports .csv, .xlsx, .xls up to 15MB
              </p>
            </div>
          </div>

          {previewing && (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center text-xs text-brand-400 animate-pulse">
              Parsing headers & analyzing schema...
            </div>
          )}
        </div>

        {/* Right: Column Mapping & Sample Preview */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Step 2: Column Mapping & Validation Preview
            </h3>
            {previewData && (
              <span className="text-xs text-brand-400 font-mono">
                {previewData.totalRowsCount} rows detected
              </span>
            )}
          </div>

          {!previewData ? (
            <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl text-center p-6 text-xs text-slate-400 space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-400" />
              <p>Upload a file on the left to inspect headers and customize column mappings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mapping Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                {[
                  { key: 'supplierGstin', label: 'Supplier GSTIN *' },
                  { key: 'supplierName', label: 'Supplier Name *' },
                  { key: 'invoiceNumber', label: 'Invoice Number *' },
                  { key: 'invoiceDate', label: 'Invoice Date *' },
                  { key: 'taxableValue', label: 'Taxable Value *' },
                  { key: 'cgst', label: 'CGST Amount' },
                  { key: 'sgst', label: 'SGST Amount' },
                  { key: 'igst', label: 'IGST Amount' },
                  { key: 'totalAmount', label: 'Total Amount' },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300">{field.label}</label>
                    <select
                      value={columnMapping[field.key] || ''}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, [field.key]: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                    >
                      <option value="">-- Auto-detect --</option>
                      {previewData.headers.map((h: string) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample Rows Preview */}
              <div className="table-container max-h-40">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      {previewData.headers.slice(0, 7).map((h: string) => (
                        <th key={h} className="p-2 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {previewData.previewRows.map((row: any, i: number) => (
                      <tr key={i}>
                        {previewData.headers.slice(0, 7).map((h: string) => (
                          <td key={h} className="p-2 whitespace-nowrap font-mono text-slate-400">
                            {row[h] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleExecuteImport}
                  disabled={importing}
                  className="px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-lg shadow-brand-950/40 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{importing ? 'Processing & Validating...' : 'Confirm & Ingest Records'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Import History & Audit Log</h3>
          <button
            onClick={fetchJobs}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="table-container">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Dataset</th>
                <th className="p-3.5">Filename</th>
                <th className="p-3.5">Uploaded At</th>
                <th className="p-3.5 text-right">Total Rows</th>
                <th className="p-3.5 text-right">Imported</th>
                <th className="p-3.5 text-right">Failed / Skipped</th>
                <th className="p-3.5 text-right">Duplicates</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400">
                    No import jobs recorded yet.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job._id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 font-semibold text-white">
                      {job.datasetType === 'PURCHASE_REGISTER' ? 'Purchase Register' : 'GSTR-2B'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{job.fileName}</td>
                    <td className="p-3.5 text-slate-400">{formatDate(job.createdAt)}</td>
                    <td className="p-3.5 text-right font-mono text-slate-200">{job.totalRows}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-400 font-bold">{job.importedRows}</td>
                    <td className="p-3.5 text-right font-mono text-rose-400">{job.failedRows}</td>
                    <td className="p-3.5 text-right font-mono text-amber-400">{job.duplicateRows}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-medium border ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                            : job.status === 'PARTIALLY_FAILED'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                            : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {job.failedRows > 0 ? (
                        <button
                          onClick={() => setErrorModalJob(job)}
                          className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold"
                        >
                          View Errors ({job.failedRows})
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row Error Details Modal */}
      {errorModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Import Row Errors: {errorModalJob.fileName}
              </h3>
              <button
                onClick={() => setErrorModalJob(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {errorModalJob.errors && errorModalJob.errors.length > 0 ? (
                errorModalJob.errors.map((err, i) => (
                  <div key={i} className="py-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-400">Row {err.rowNumber}</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Inv: {err.rawInvoiceNumber || 'N/A'} • GSTIN: {err.supplierGstin || 'N/A'}
                      </span>
                    </div>
                    <p className="text-slate-300">{err.errorMessage}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">No error details logged</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
