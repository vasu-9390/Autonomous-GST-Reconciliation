import mongoose, { Document, Schema } from 'mongoose';

export type ReconRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface IReconciliationRun extends Document {
  organizationId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  period: string;
  status: ReconRunStatus;
  totalPurchaseInvoices: number;
  totalGstr2bInvoices: number;
  exactMatchesCount: number;
  probableMatchesCount: number;
  amountMismatchCount: number;
  taxMismatchCount: number;
  missingIn2bCount: number;
  missingInPurchaseCount: number;
  duplicateCandidatesCount: number;
  totalTaxAtRisk: number; // Discrepancy or unfiled ITC at risk
  totalMatchedTax: number;
  reconciledPercentage: number;
  executionTimeMs: number;
  config: {
    amountTolerance: number;
    taxTolerance: number;
    dateWindowDays: number;
    fuzzyDistance: number;
  };
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReconciliationRunSchema = new Schema<IReconciliationRun>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    period: { type: String, required: true, default: 'All Invoices' },
    status: {
      type: String,
      enum: ['RUNNING', 'COMPLETED', 'FAILED'],
      default: 'RUNNING',
    },
    totalPurchaseInvoices: { type: Number, default: 0 },
    totalGstr2bInvoices: { type: Number, default: 0 },
    exactMatchesCount: { type: Number, default: 0 },
    probableMatchesCount: { type: Number, default: 0 },
    amountMismatchCount: { type: Number, default: 0 },
    taxMismatchCount: { type: Number, default: 0 },
    missingIn2bCount: { type: Number, default: 0 },
    missingInPurchaseCount: { type: Number, default: 0 },
    duplicateCandidatesCount: { type: Number, default: 0 },
    totalTaxAtRisk: { type: Number, default: 0 },
    totalMatchedTax: { type: Number, default: 0 },
    reconciledPercentage: { type: Number, default: 0 },
    executionTimeMs: { type: Number, default: 0 },
    config: {
      amountTolerance: { type: Number, default: 1.0 },
      taxTolerance: { type: Number, default: 1.0 },
      dateWindowDays: { type: Number, default: 30 },
      fuzzyDistance: { type: Number, default: 2 },
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

ReconciliationRunSchema.index({ organizationId: 1, createdAt: -1 });

export const ReconciliationRun = mongoose.model<IReconciliationRun>('ReconciliationRun', ReconciliationRunSchema);
