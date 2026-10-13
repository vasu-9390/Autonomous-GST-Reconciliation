import { MismatchPriority, MismatchStatus, MismatchType } from '../types';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return '-';
  }
}

export function formatMatchType(matchType: MismatchType): string {
  const map: Record<MismatchType, string> = {
    EXACT_MATCH: 'Exact Match',
    PROBABLE_MATCH_DATE: 'Probable (Date Shift)',
    PROBABLE_MATCH_FUZZY: 'Probable (Fuzzy Inv #)',
    AMOUNT_MISMATCH: 'Amount Mismatch',
    TAX_MISMATCH: 'Tax Mismatch',
    MISSING_IN_GSTR2B: 'Missing in GSTR-2B',
    MISSING_IN_PURCHASE_REGISTER: 'Missing in Books',
    DUPLICATE_CANDIDATE: 'Duplicate Candidate',
  };
  return map[matchType] || matchType;
}

export function getPriorityBadgeColor(priority: MismatchPriority): {
  bg: string;
  text: string;
  border: string;
} {
  switch (priority) {
    case 'CRITICAL':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
    case 'HIGH':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'MEDIUM':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'LOW':
    default:
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
  }
}

export function getStatusBadgeColor(status: MismatchStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'RESOLVED':
    case 'AUTO_MATCHED':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'UNDER_REVIEW':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' };
    case 'REJECTED':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
    case 'PENDING_REVIEW':
    default:
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
  }
}
