import React from 'react';
import { MismatchPriority, MismatchStatus, MismatchType } from '../types';
import { formatMatchType, getPriorityBadgeColor, getStatusBadgeColor } from '../utils/formatters';
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, ShieldAlert } from 'lucide-react';

export const PriorityBadge: React.FC<{ priority: MismatchPriority }> = ({ priority }) => {
  const { bg, text, border } = getPriorityBadgeColor(priority);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg} ${text} ${border}`}
    >
      {priority === 'CRITICAL' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
      {priority === 'HIGH' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
      {priority === 'MEDIUM' && <Clock className="w-3.5 h-3.5 text-blue-400" />}
      {priority === 'LOW' && <HelpCircle className="w-3.5 h-3.5 text-slate-400" />}
      {priority}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: MismatchStatus }> = ({ status }) => {
  const { bg, text, border } = getStatusBadgeColor(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg} ${text} ${border}`}
    >
      {status === 'RESOLVED' || status === 'AUTO_MATCHED' ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <Clock className="w-3.5 h-3.5 text-amber-400" />
      )}
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export const MatchTypeBadge: React.FC<{ matchType: MismatchType }> = ({ matchType }) => {
  const label = formatMatchType(matchType);

  let style = 'bg-slate-800 text-slate-300 border-slate-700';
  if (matchType === 'EXACT_MATCH') style = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
  else if (matchType.startsWith('PROBABLE')) style = 'bg-blue-950/40 text-blue-300 border-blue-800/40';
  else if (matchType === 'MISSING_IN_GSTR2B') style = 'bg-rose-950/40 text-rose-300 border-rose-800/40';
  else if (matchType === 'TAX_MISMATCH' || matchType === 'AMOUNT_MISMATCH')
    style = 'bg-amber-950/40 text-amber-300 border-amber-800/40';

  return (
    <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
};
