import React, { useState } from 'react';
import { MismatchCase } from '../types';
import { ApiService } from '../services/api';
import { PriorityBadge, MatchTypeBadge } from './StatusBadge';
import { formatCurrency } from '../utils/formatters';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface CopilotDrawerProps {
  caseItem: MismatchCase | null;
  onClose: () => void;
  onRefreshCase?: () => void;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({ caseItem, onClose, onRefreshCase }) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  if (!caseItem) return null;

  const handleGenerateAi = async () => {
    setLoading(true);
    try {
      await ApiService.copilot.explainMismatch(caseItem._id);
      if (onRefreshCase) onRefreshCase();
    } catch (err) {
      console.error('Failed to generate AI explanation', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleCheck = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const aiData = caseItem.aiExplanation;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                GST Mismatch Copilot
                <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono">
                  Gemini 1.5
                </span>
              </h2>
              <p className="text-xs text-slate-400">Root-cause diagnosis & compliance resolution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Summary Card */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Discrepancy Target</span>
              <PriorityBadge priority={caseItem.priority} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{caseItem.supplierName}</h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>GSTIN: <span className="font-mono text-slate-300">{caseItem.supplierGstin}</span></span>
                <span>•</span>
                <span>Invoice: <span className="font-mono text-slate-300">{caseItem.invoiceNumber}</span></span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Match Classification:</span>
              <MatchTypeBadge matchType={caseItem.matchType} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tax At Risk:</span>
              <span className="font-bold text-rose-400 currency-font">{formatCurrency(caseItem.taxDiscrepancy)}</span>
            </div>
          </div>

          {/* AI Explanation Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                AI Diagnosis & Root Cause
              </h4>
              <button
                onClick={handleGenerateAi}
                disabled={loading}
                className="text-xs text-brand-400 hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Re-analyze
              </button>
            </div>

            {loading ? (
              <div className="p-8 rounded-xl border border-slate-800 bg-slate-950/40 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400 mx-auto" />
                <p className="text-xs text-slate-300">Generating compliance diagnosis with Gemini AI...</p>
              </div>
            ) : aiData ? (
              <div className="space-y-4">
                {/* Explanation text */}
                <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-950/20 text-xs text-slate-200 leading-relaxed">
                  {aiData.explanation}
                </div>

                {/* Possible Causes */}
                {aiData.possibleCauses && aiData.possibleCauses.length > 0 && (
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">Probable Business & Filing Causes:</span>
                    <ul className="space-y-1.5">
                      {aiData.possibleCauses.map((cause, idx) => (
                        <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Action */}
                {aiData.recommendedAction && (
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/20 space-y-1">
                    <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Recommended Action
                    </span>
                    <p className="text-xs text-slate-300">{aiData.recommendedAction}</p>
                  </div>
                )}

                {/* Verification Checklist */}
                {aiData.verificationChecklist && aiData.verificationChecklist.length > 0 && (
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">Accountant Verification Checklist:</span>
                    <div className="space-y-2">
                      {aiData.verificationChecklist.map((step, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleCheck(idx)}
                          className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                            checkedSteps[idx] ? 'bg-emerald-950/20 text-emerald-300' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!checkedSteps[idx]}
                            onChange={() => {}}
                            className="mt-0.5 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0"
                          />
                          <span className={`text-xs ${checkedSteps[idx] ? 'line-through text-slate-400' : ''}`}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vendor Follow-up Template */}
                {aiData.supplierFollowUpTemplate && (
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-indigo-400" /> Draft Vendor Communication
                      </span>
                      <button
                        onClick={() => handleCopyTemplate(aiData.supplierFollowUpTemplate!)}
                        className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Copy Draft'}
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                      {aiData.supplierFollowUpTemplate}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/40 text-center space-y-3">
                <p className="text-xs text-slate-400">No AI diagnosis generated yet for this mismatch case.</p>
                <button
                  onClick={handleGenerateAi}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-colors shadow-md flex items-center gap-1.5 mx-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Analyze with Gemini AI
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5" /> Deterministic tax validation applied
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
