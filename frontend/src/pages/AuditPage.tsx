import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { AuditLog } from '../types';
import { formatDate } from '../utils/formatters';
import { ShieldCheck, RefreshCw, Activity, Terminal } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await ApiService.audit.list();
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Tamper-Evident Audit Trail
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Chronological, immutable record of all reconciliation executions, status changes, and user activities
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="table-container">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-3.5">Timestamp</th>
              <th className="p-3.5">Actor (User)</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Action Executed</th>
              <th className="p-3.5">Resource</th>
              <th className="p-3.5">Changes / State Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 font-sans text-xs">
                  No audit logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-3.5 text-slate-400 font-sans">
                    {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="p-3.5 text-white font-sans font-semibold">{log.userName}</td>
                  <td className="p-3.5 text-brand-400 font-sans">{log.userRole}</td>
                  <td className="p-3.5 text-amber-300 font-semibold">{log.action}</td>
                  <td className="p-3.5 text-slate-300">{log.resourceType}</td>
                  <td className="p-3.5 text-slate-400 max-w-xs truncate">
                    {log.afterState ? JSON.stringify(log.afterState) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
