import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import { MismatchCase, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge, MatchTypeBadge, StatusBadge } from '../components/StatusBadge';
import { CopilotDrawer } from '../components/CopilotDrawer';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  UserCheck,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Send,
  X,
  FileText,
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<MismatchCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<MismatchCase | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [matchType, setMatchType] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');

  // Drawer
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Resolution modal
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionTaken, setActionTaken] = useState('Accepted after verification');

  // Comments & team members
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [teamMembers, setTeamMembers] = useState<User[]>([]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await ApiService.reconciliation.getCases({
        search: search || undefined,
        matchType: matchType || undefined,
        priority: priority || undefined,
        status: status || undefined,
        limit: '100',
      });
      const fetchedCases = res.data.cases || [];
      setCases(fetchedCases);

      if (fetchedCases.length > 0 && !selectedCase) {
        setSelectedCase(fetchedCases[0]);
      }
    } catch (err) {
      console.error('Failed to load cases', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await ApiService.organization.listMembers();
      setTeamMembers(res.data.members || []);
    } catch (err) {
      // Quiet
    }
  };

  const fetchComments = async (caseId: string) => {
    try {
      const res = await ApiService.mismatches.getById(caseId);
      setComments(res.data.comments || []);
    } catch (err) {
      console.error('Failed to load comments', err);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchMembers();
  }, [search, matchType, priority, status]);

  useEffect(() => {
    if (selectedCase) {
      fetchComments(selectedCase._id);
    }
  }, [selectedCase?._id]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedCase) return;
    try {
      const res = await ApiService.mismatches.updateStatus(selectedCase._id, {
        status: newStatus,
        actionTaken,
        resolutionNotes,
      });
      setSelectedCase(res.data.case);
      setShowResolveModal(false);
      fetchCases();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleAssign = async (userId: string) => {
    if (!selectedCase || !userId) return;
    try {
      const res = await ApiService.mismatches.assign(selectedCase._id, userId);
      setSelectedCase(res.data.case);
      fetchCases();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Assignment failed');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newComment.trim()) return;
    try {
      const res = await ApiService.mismatches.addComment(selectedCase._id, newComment);
      setComments((prev) => [...prev, res.data.comment]);
      setNewComment('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post comment');
    }
  };

  const prInv = selectedCase?.purchaseInvoiceId;
  const g2bInv = selectedCase?.gstr2bInvoiceId;
  const diffs = selectedCase?.differenceDetails;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          Mismatch Investigation Workspace
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Deep-dive side-by-side tax comparison, AI explanation, accountant comments & resolution approvals
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Supplier, GSTIN, Invoice #..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          value={matchType}
          onChange={(e) => setMatchType(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Classifications</option>
          <option value="EXACT_MATCH">Exact Match</option>
          <option value="PROBABLE_MATCH_DATE">Probable (Date Shift)</option>
          <option value="PROBABLE_MATCH_FUZZY">Probable (Fuzzy Inv #)</option>
          <option value="AMOUNT_MISMATCH">Amount Mismatch</option>
          <option value="TAX_MISMATCH">Tax Mismatch</option>
          <option value="MISSING_IN_GSTR2B">Missing in GSTR-2B</option>
          <option value="MISSING_IN_PURCHASE_REGISTER">Missing in Books</option>
          <option value="DUPLICATE_CANDIDATE">Duplicate Candidate</option>
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Cases List (4 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
            <span>Discrepancy Cases ({cases.length})</span>
            <span>Tax At Risk</span>
          </div>

          <div className="space-y-2 max-h-[780px] overflow-y-auto pr-1">
            {cases.length === 0 ? (
              <div className="p-8 border border-slate-800 rounded-xl bg-slate-950/40 text-center text-xs text-slate-400">
                No matching discrepancies found.
              </div>
            ) : (
              cases.map((c) => {
                const isSelected = selectedCase?._id === c._id;
                return (
                  <div
                    key={c._id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-500 bg-brand-950/25 shadow-md shadow-brand-950/20'
                        : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{c.supplierName}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-0.5">
                          <span>{c.invoiceNumber}</span>
                          <span>•</span>
                          <span>{c.supplierGstin}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-rose-400 currency-font shrink-0">
                        {formatCurrency(c.taxDiscrepancy)}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={c.priority} />
                        <MatchTypeBadge matchType={c.matchType} />
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed Inspection & Resolution Workspace (7 Cols) */}
        <div className="lg:col-span-7">
          {!selectedCase ? (
            <div className="p-12 border border-slate-800 rounded-2xl bg-slate-950/40 text-center text-xs text-slate-400">
              Select a discrepancy case from the left to inspect side-by-side details
            </div>
          ) : (
            <div className="space-y-6">
              {/* Inspection Header Card */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/70 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedCase.supplierName}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>GSTIN: <span className="font-mono text-slate-200">{selectedCase.supplierGstin}</span></span>
                      <span>•</span>
                      <span>Inv: <span className="font-mono text-slate-200">{selectedCase.invoiceNumber}</span></span>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsCopilotOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Copilot AI</span>
                    </button>

                    {user?.role !== 'AUDITOR' && (
                      <>
                        {selectedCase.status !== 'RESOLVED' ? (
                          <button
                            onClick={() => setShowResolveModal(true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Resolve</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus('PENDING_REVIEW')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                          >
                            Reopen
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Priority & Reason Banner */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start gap-2.5 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200">Priority Assessment: </span>
                    <span className="text-slate-400">{selectedCase.priorityReason}</span>
                  </div>
                </div>

                {/* Assignment & Status Controls */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Assigned To:</span>
                    <select
                      value={selectedCase.assignedTo?._id || ''}
                      onChange={(e) => handleAssign(e.target.value)}
                      disabled={user?.role === 'AUDITOR'}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id || (m as any)._id} value={m.id || (m as any)._id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Current Status:</span>
                    <StatusBadge status={selectedCase.status} />
                  </div>
                </div>
              </div>

              {/* Side-by-Side Financial Invoice Comparison Table */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/70 shadow-lg space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-400" />
                  Side-by-Side Voucher & Return Reconciliation
                </h4>

                <div className="table-container">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-3">Component</th>
                        <th className="p-3 text-right">Purchase Register (Books)</th>
                        <th className="p-3 text-right">GSTR-2B (Filed)</th>
                        <th className="p-3 text-right">Variance / Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      <tr>
                        <td className="p-3 font-sans font-medium text-slate-200">Invoice Number</td>
                        <td className="p-3 text-right">{prInv?.invoiceNumber || '-'}</td>
                        <td className="p-3 text-right">{g2bInv?.invoiceNumber || '-'}</td>
                        <td className="p-3 text-right text-slate-400">
                          {prInv && g2bInv && prInv.normalizedInvoiceNumber === g2bInv.normalizedInvoiceNumber
                            ? 'Normalized Match'
                            : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-medium text-slate-200">Invoice Date</td>
                        <td className="p-3 text-right">{formatDate(prInv?.invoiceDate)}</td>
                        <td className="p-3 text-right">{formatDate(g2bInv?.invoiceDate)}</td>
                        <td className="p-3 text-right text-slate-400">
                          {diffs?.dateDiffDays ? `${diffs.dateDiffDays} days diff` : 'Exact'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-medium text-slate-200">Taxable Value</td>
                        <td className="p-3 text-right">{formatCurrency(prInv?.taxableValue || 0)}</td>
                        <td className="p-3 text-right">{formatCurrency(g2bInv?.taxableValue || 0)}</td>
                        <td className={`p-3 text-right font-bold ${diffs?.taxableDiff ? 'text-amber-400' : 'text-slate-400'}`}>
                          {formatCurrency(diffs?.taxableDiff || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-medium text-slate-200">CGST Amount</td>
                        <td className="p-3 text-right">{formatCurrency(prInv?.cgst || 0)}</td>
                        <td className="p-3 text-right">{formatCurrency(g2bInv?.cgst || 0)}</td>
                        <td className={`p-3 text-right ${diffs?.cgstDiff ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                          {formatCurrency(diffs?.cgstDiff || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-medium text-slate-200">SGST Amount</td>
                        <td className="p-3 text-right">{formatCurrency(prInv?.sgst || 0)}</td>
                        <td className="p-3 text-right">{formatCurrency(g2bInv?.sgst || 0)}</td>
                        <td className={`p-3 text-right ${diffs?.sgstDiff ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                          {formatCurrency(diffs?.sgstDiff || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-sans font-medium text-slate-200">IGST Amount</td>
                        <td className="p-3 text-right">{formatCurrency(prInv?.igst || 0)}</td>
                        <td className="p-3 text-right">{formatCurrency(g2bInv?.igst || 0)}</td>
                        <td className={`p-3 text-right ${diffs?.igstDiff ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                          {formatCurrency(diffs?.igstDiff || 0)}
                        </td>
                      </tr>
                      <tr className="bg-slate-900/40 font-bold text-white">
                        <td className="p-3 font-sans">Total Invoice Amount</td>
                        <td className="p-3 text-right">{formatCurrency(prInv?.totalAmount || 0)}</td>
                        <td className="p-3 text-right">{formatCurrency(g2bInv?.totalAmount || 0)}</td>
                        <td className={`p-3 text-right ${diffs?.totalDiff ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatCurrency(diffs?.totalDiff || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Evidence Log */}
                {selectedCase.evidence && selectedCase.evidence.length > 0 && (
                  <div className="pt-3 border-t border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Deterministic Engine Evidence:
                    </span>
                    <ul className="space-y-1">
                      {selectedCase.evidence.map((ev, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Internal Collaboration Comments Timeline */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/70 shadow-lg space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-400" />
                  Accountant Verification Notes & Audit Discussion
                </h4>

                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No notes added to this case yet.</p>
                  ) : (
                    comments.map((cm) => (
                      <div key={cm._id} className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            {cm.userName} <span className="text-[10px] text-brand-400">({cm.userRole})</span>
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDate(cm.createdAt)}</span>
                        </div>
                        <p className="text-slate-300">{cm.commentText}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Post Comment Input */}
                {user?.role !== 'AUDITOR' && (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add an internal observation, bill verification note, or vendor call log..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-40 transition-colors shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resolution Confirmation Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Record Discrepancy Resolution
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Action Taken</label>
                <select
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="Accepted after verification">Accepted after verification</option>
                  <option value="Vendor issued credit note">Vendor issued credit note</option>
                  <option value="Passed ERP journal voucher adjustment">Passed ERP journal voucher adjustment</option>
                  <option value="Vendor amended GSTR-1 in Table 9A">Vendor amended GSTR-1 in Table 9A</option>
                  <option value="Disallowed ineligible ITC">Disallowed ineligible ITC</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Resolution Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Provide supporting ledger entry reference or voucher reason..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus('RESOLVED')}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Copilot Drawer */}
      <CopilotDrawer
        caseItem={selectedCase}
        onClose={() => setIsCopilotOpen(false)}
        onRefreshCase={fetchCases}
      />
    </div>
  );
};
