import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { MismatchCase, ReconciliationRun } from '../types';
import { StatCard } from '../components/StatCard';
import { PriorityBadge, MatchTypeBadge, StatusBadge } from '../components/StatusBadge';
import { CopilotDrawer } from '../components/CopilotDrawer';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  FileText,
  CheckCircle,
  AlertOctagon,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Play,
  Upload,
  RefreshCw,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentCases, setRecentCases] = useState<MismatchCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<MismatchCase | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsRes, casesRes] = await Promise.all([
        ApiService.reconciliation.getDashboardMetrics(),
        ApiService.reconciliation.getCases({ limit: '6', status: 'PENDING_REVIEW' }),
      ]);
      setMetrics(metricsRes.data);
      setRecentCases(casesRes.data.cases || []);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const latestRun: ReconciliationRun | null = metrics?.latestRun || null;
  const summary = metrics?.summary;

  // Chart data preparation
  const categoryData = (summary?.breakdown || []).map((b: any) => ({
    name: b._id.replace(/_/g, ' '),
    count: b.count,
    discrepancy: b.totalTaxDiscrepancy,
  }));

  const priorityData = (summary?.priorityBreakdown || []).map((p: any) => ({
    name: p._id,
    value: p.count,
  }));

  const PRIORITY_COLORS: Record<string, string> = {
    CRITICAL: '#f43f5e',
    HIGH: '#f59e0b',
    MEDIUM: '#3b82f6',
    LOW: '#64748b',
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            GST Reconciliation Overview
            <span className="text-xs px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">
              Live DB
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial status for period {latestRun?.period || '2024-Q3'} • Deterministic verification
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/imports')}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Import Data</span>
          </button>
          <button
            onClick={() => navigate('/reconciliations')}
            className="px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-md shadow-brand-950/40 transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Reconciliation</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoices"
          value={latestRun ? latestRun.totalPurchaseInvoices + latestRun.totalGstr2bInvoices : 0}
          subtitle={`PR: ${latestRun?.totalPurchaseInvoices || 0} • 2B: ${latestRun?.totalGstr2bInvoices || 0}`}
          icon={FileText}
          variant="brand"
        />

        <StatCard
          title="Matched Rate"
          value={`${latestRun?.reconciledPercentage || 0}%`}
          subtitle={`${latestRun?.exactMatchesCount || 0} exact, ${latestRun?.probableMatchesCount || 0} probable`}
          icon={CheckCircle}
          variant="success"
          trend={{ value: 'Deterministic match', isPositive: true }}
        />

        <StatCard
          title="ITC Tax At Risk"
          value={formatCurrency(latestRun?.totalTaxAtRisk || 0)}
          subtitle={`${latestRun?.missingIn2bCount || 0} unfiled supplier invoices`}
          icon={TrendingDown}
          variant="danger"
        />

        <StatCard
          title="Pending Action"
          value={summary?.pendingCases || 0}
          subtitle={`${summary?.highPriorityCount || 0} high / critical priority`}
          icon={ShieldAlert}
          variant="warning"
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-800 bg-slate-950/60 shadow-inner space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Discrepancies by Match Category
            </h3>
            <span className="text-[11px] text-slate-400">Total Cases: {summary?.totalCases || 0}</span>
          </div>

          <div className="h-64 w-full">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No reconciliation discrepancies recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={10}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Priority Severity Distribution */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 shadow-inner space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Priority Risk Distribution
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Calculated by monetary impact & ITC risk</p>
          </div>

          <div className="h-44 w-full">
            {priorityData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No priority data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {priorityData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PRIORITY_COLORS[entry.name] || '#64748b'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => {
              const count = priorityData.find((d: any) => d.name === p)?.value || 0;
              return (
                <div key={p} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: PRIORITY_COLORS[p] }}
                  />
                  <span className="text-slate-400 text-[11px]">{p}:</span>
                  <span className="font-semibold text-white currency-font">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical & High Priority Mismatches Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              High Priority Discrepancies Requiring Review
            </h3>
            <p className="text-xs text-slate-400">
              Invoices with potential ITC blockage or supplier filing variance
            </p>
          </div>
          <button
            onClick={() => navigate('/workspace')}
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1"
          >
            <span>View All Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="table-container">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Supplier & GSTIN</th>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Classification</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5 text-right">Tax Discrepancy</th>
                <th className="p-3.5 text-right">Status</th>
                <th className="p-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No pending discrepancies found. All records aligned!
                  </td>
                </tr>
              ) : (
                recentCases.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{c.supplierName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{c.supplierGstin}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-200">{c.invoiceNumber}</td>
                    <td className="p-3.5">
                      <MatchTypeBadge matchType={c.matchType} />
                    </td>
                    <td className="p-3.5">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="p-3.5 text-right font-bold text-rose-400 currency-font">
                      {formatCurrency(c.taxDiscrepancy)}
                    </td>
                    <td className="p-3.5 text-right">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setSelectedCase(c)}
                        className="px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 text-xs font-semibold transition-colors flex items-center gap-1 mx-auto"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Copilot</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Copilot Drawer */}
      <CopilotDrawer
        caseItem={selectedCase}
        onClose={() => setSelectedCase(null)}
        onRefreshCase={fetchDashboardData}
      />
    </div>
  );
};
