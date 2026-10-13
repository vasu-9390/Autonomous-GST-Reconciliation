import { MismatchPriority, MismatchType } from '../../models/MismatchCase';

export interface PriorityScoreResult {
  priority: MismatchPriority;
  priorityReason: string;
}

export class PriorityScorer {
  /**
   * Transparent rules-based priority and risk scoring
   */
  static calculate(
    matchType: MismatchType,
    taxDiscrepancy: number,
    totalDifference: number,
    totalAmount: number,
    isDuplicateCandidate = false
  ): PriorityScoreResult {
    // Rule 1: Duplicate candidates are high operational risk
    if (isDuplicateCandidate || matchType === 'DUPLICATE_CANDIDATE') {
      return {
        priority: 'CRITICAL',
        priorityReason: `Potential duplicate record detected with invoice value ₹${totalAmount.toLocaleString('en-IN')}. Risk of double-counting or double tax payment.`,
      };
    }

    // Rule 2: Missing in GSTR-2B (ITC blocked under GST Rule 36(4))
    if (matchType === 'MISSING_IN_GSTR2B') {
      if (taxDiscrepancy >= 10000) {
        return {
          priority: 'CRITICAL',
          priorityReason: `Unfiled by supplier in GSTR-2B. High financial exposure with ₹${taxDiscrepancy.toLocaleString('en-IN')} in input tax credit currently disallowed.`,
        };
      }
      if (taxDiscrepancy >= 2500) {
        return {
          priority: 'HIGH',
          priorityReason: `Missing in GSTR-2B with substantial ITC exposure of ₹${taxDiscrepancy.toLocaleString('en-IN')}. Immediate supplier follow-up advised.`,
        };
      }
      return {
        priority: 'MEDIUM',
        priorityReason: `Missing in GSTR-2B with minor ITC variance of ₹${taxDiscrepancy.toLocaleString('en-IN')}. Verify if supplier filed under quarterly QRMP scheme.`,
      };
    }

    // Rule 3: Missing in Purchase Register (Unclaimed Tax Credit)
    if (matchType === 'MISSING_IN_PURCHASE_REGISTER') {
      return {
        priority: 'MEDIUM',
        priorityReason: `Present in GSTR-2B but omitted from purchase register. Potential unclaimed input tax credit of ₹${taxDiscrepancy.toLocaleString('en-IN')}.`,
      };
    }

    // Rule 4: Tax Mismatch / Amount Mismatch
    if (matchType === 'TAX_MISMATCH' || matchType === 'AMOUNT_MISMATCH') {
      if (taxDiscrepancy >= 10000 || totalDifference >= 25000) {
        return {
          priority: 'CRITICAL',
          priorityReason: `Significant variance between purchase register and GSTR-2B (Tax variance: ₹${taxDiscrepancy.toLocaleString('en-IN')}, Total diff: ₹${totalDifference.toLocaleString('en-IN')}).`,
        };
      }
      if (taxDiscrepancy >= 1000 || totalDifference >= 5000) {
        return {
          priority: 'HIGH',
          priorityReason: `Material discrepancy in reported tax components (Variance: ₹${taxDiscrepancy.toLocaleString('en-IN')}). Requires manual ledger review.`,
        };
      }
      return {
        priority: 'MEDIUM',
        priorityReason: `Moderate value variance (₹${totalDifference.toLocaleString('en-IN')}). Check for item-level tax rate misapplication.`,
      };
    }

    // Rule 5: Probable matches
    if (matchType === 'PROBABLE_MATCH_DATE' || matchType === 'PROBABLE_MATCH_FUZZY') {
      return {
        priority: 'LOW',
        priorityReason: 'Invoice values match within configured tolerance; minor variance in reporting date or delimiter formatting.',
      };
    }

    // Default Low
    return {
      priority: 'LOW',
      priorityReason: 'Values and identifiers align within acceptable reconciliation thresholds.',
    };
  }
}
