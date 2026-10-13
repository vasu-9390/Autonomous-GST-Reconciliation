import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  FileSpreadsheet,
  Download,
  Building,
  TrendingDown,
  ShieldAlert,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await ApiService.reports.getSupplierVariance();
      setSuppliers(res.data.suppliers || []);
    } catch (err) {
      console.error('Failed to load supplier variance report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownload = (format: 'xlsx' | 'csv') => {
    const url = ApiService.reports.exportUrl(format);
    window.open(url, '_blank');
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            GST Reconciliation Reports & Exports
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Download audit-compliant reconciliation registers and analyze supplier-wise tax exposure
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDownload('csv')}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleDownload('xlsx')}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* Supplier-wise Exposure Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Supplier-Wise Discrepancy & ITC Exposure Ranking
            </h3>
            <p className="text-xs text-slate-400">
              Vendors sorted by highest input tax credit at risk
            </p>
          </div>
          <button
            onClick={fetchReports}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="table-container">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Supplier Name</th>
                <th className="p-3.5">Supplier GSTIN</th>
                <th className="p-3.5 text-right">Total Discrepancies</th>
                <th className="p-3.5 text-right">Critical Risk</th>
                <th className="p-3.5 text-right">Unfiled Invoices (2B)</th>
                <th className="p-3.5 text-right">Total Amount Variance</th>
                <th className="p-3.5 text-right">Tax Exposure (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No supplier discrepancies recorded.
                  </td>
                </tr>
              ) : (
                suppliers.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 font-semibold text-white">{s.supplierName}</td>
                    <td className="p-3.5 font-mono text-slate-300">{s.supplierGstin}</td>
                    <td className="p-3.5 text-right font-mono text-slate-300">{s.totalIssues}</td>
                    <td className="p-3.5 text-right font-mono text-rose-400 font-semibold">
                      {s.criticalIssues}
                    </td>
                    <td className="p-3.5 text-right font-mono text-amber-400">
                      {s.missingIn2bCount}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-300 currency-font">
                      {formatCurrency(s.totalAmountDifference)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-rose-400 currency-font">
                      {formatCurrency(s.totalTaxDiscrepancy)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
