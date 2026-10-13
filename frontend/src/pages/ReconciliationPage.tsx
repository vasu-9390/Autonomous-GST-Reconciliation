import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { ReconciliationRun } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Play,
  FileCheck2,
  Sliders,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  TrendingDown,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react';

export const ReconciliationPage: React.FC = () => {
  const [runs, setRuns] = useState<ReconciliationRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [period, setPeriod] = useState('2024-Q3');
  const [amountTolerance, setAmountTolerance] = useState(1.0);
  const [taxTolerance, setTaxTolerance] = useState(1.0);
  const [dateWindowDays, setDateWindowDays] = useState(30);
  const [fuzzyDistance, setFuzzyDistance] = useState(2);

  // AI Summary Modal state
  const [summaryRunId, setSummaryRunId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [summarizing, setSummarizing] = useState(false);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const res = await ApiService.reconciliation.getRuns();
      setRuns(res.data.runs || []);
    } catch (err) {
      console.error('Failed to load reconciliation runs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleTriggerRun = async () => {
    setTriggering(true);
    try {
      await ApiService.reconciliation.trigger({
        period,
        amountTolerance: Number(amountTolerance),
        taxTolerance: Number(taxTolerance),
        dateWindowDays: Number(dateWindowDays),
        fuzzyDistance: Number(fuzzyDistance),
      });
      await fetchRuns();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Reconciliation failed');
    } finally {
      setTriggering(false);
    }
  };

  const handleOpenAiSummary = async (runId: string) => {
    setSummaryRunId(runId);
    setSummarizing(true);
    try {
      const res = await ApiService.copilot.summarizeRun(runId);
      setAiSummary(res.data.summary);
    } catch (err) {
      console.error('Failed to summarize run', err);
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Autonomous Reconciliation Engine
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Execute multi-stage deterministic invoice matching with custom tolerance thresholds and audit reproducibility
        </p>
      </div>

      {/* Reconciliation Trigger Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950/60 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Deterministic Matching Parameters & Tolerances
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">10-Stage Pipeline Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Tax Filing Period</label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="e.g. 2024-Q3"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Amount Tolerance (₹)</label>
            <input
              type="number"
              step="0.1"
              value={amountTolerance}
              onChange={(e) => setAmountTolerance(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Tax Tolerance (₹)</label>
            <input
              type="number"
              step="0.1"
              value={taxTolerance}
              onChange={(e) => setTaxTolerance(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Date Window (Days)</label>
            <input
              type="number"
              value={dateWindowDays}
              onChange={(e) => setDateWindowDays(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Fuzzy Edit Distance</label>
            <input
              type="number"
              value={fuzzyDistance}
              onChange={(e) => setFuzzyDistance(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleTriggerRun}
            disabled={triggering}
            className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-lg shadow-brand-950/40 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {triggering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Comparing Records Deterministically...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Execute Reconciliation Run</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historical Runs Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Reconciliation Runs History</h3>
          <button
            onClick={fetchRuns}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="table-container">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Execution Time</th>
                <th className="p-3.5">Period</th>
                <th className="p-3.5 text-right">Invoices Compared</th>
                <th className="p-3.5 text-right">Match Rate</th>
                <th className="p-3.5 text-right">Exact Matches</th>
                <th className="p-3.5 text-right">Probable</th>
                <th className="p-3.5 text-right">Missing in 2B</th>
                <th className="p-3.5 text-right">Tax At Risk</th>
                <th className="p-3.5 text-center">AI Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400">
                    No runs recorded yet. Click "Execute Reconciliation Run" above.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{formatDate(r.createdAt)}</div>
                      <div className="text-[10px] text-slate-400">{r.executionTimeMs}ms execution</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{r.period}</td>
                    <td className="p-3.5 text-right font-mono text-slate-300">
                      PR: {r.totalPurchaseInvoices} • 2B: {r.totalGstr2bInvoices}
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-400 currency-font">
                      {r.reconciledPercentage}%
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-300">{r.exactMatchesCount}</td>
                    <td className="p-3.5 text-right font-mono text-blue-400">{r.probableMatchesCount}</td>
                    <td className="p-3.5 text-right font-mono text-rose-400">{r.missingIn2bCount}</td>
                    <td className="p-3.5 text-right font-bold text-rose-400 currency-font">
                      {formatCurrency(r.totalTaxAtRisk)}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleOpenAiSummary(r._id)}
                        className="px-2.5 py-1 rounded bg-brand-600/15 hover:bg-brand-600/25 text-brand-300 border border-brand-500/25 text-xs font-semibold flex items-center gap-1 mx-auto transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Executive Summary</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Run Summary Modal */}
      {summaryRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Gemini Reconciliation Executive Brief</h3>
              </div>
              <button
                onClick={() => setSummaryRunId(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {summarizing ? (
              <div className="p-8 text-center text-xs text-slate-300 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400 mx-auto" />
                <p>Synthesizing reconciliation insights...</p>
              </div>
            ) : aiSummary ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-brand-950/30 border border-brand-500/30 text-slate-200 leading-relaxed">
                  {aiSummary.keyInsight}
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Matched Rate:</span>
                    <span className="text-base font-bold text-emerald-400">{aiSummary.reconciledRate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Input Tax At Risk:</span>
                    <span className="text-base font-bold text-rose-400">{aiSummary.taxAtRisk}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Unfiled Supplier Bills:</span>
                    <span className="text-sm font-semibold text-white">{aiSummary.missingIn2b} invoices</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tax Split Variances:</span>
                    <span className="text-sm font-semibold text-white">{aiSummary.taxSplitMismatches} cases</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
