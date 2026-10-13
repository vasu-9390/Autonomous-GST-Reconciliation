import mongoose, { Document, Schema } from 'mongoose';

export type MismatchType =
  | 'EXACT_MATCH'
  | 'PROBABLE_MATCH_DATE'
  | 'PROBABLE_MATCH_FUZZY'
  | 'AMOUNT_MISMATCH'
  | 'TAX_MISMATCH'
  | 'MISSING_IN_GSTR2B'
  | 'MISSING_IN_PURCHASE_REGISTER'
  | 'DUPLICATE_CANDIDATE';

export type MismatchStatus = 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED' | 'AUTO_MATCHED';
export type MismatchPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface IMismatchCase extends Document {
  organizationId: mongoose.Types.ObjectId;
  runId: mongoose.Types.ObjectId;
  purchaseInvoiceId?: mongoose.Types.ObjectId;
  gstr2bInvoiceId?: mongoose.Types.ObjectId;
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  matchType: MismatchType;
  matchStage: number; // 1 to 10
  status: MismatchStatus;
  priority: MismatchPriority;
  priorityReason: string;
  taxableDifference: number;
  totalDifference: number;
  taxDiscrepancy: number; // Discrepancy specifically at risk in ITC
  differenceDetails: {
    taxableDiff: number;
    cgstDiff: number;
    sgstDiff: number;
    igstDiff: number;
    cessDiff: number;
    totalDiff: number;
    dateDiffDays: number;
  };
  evidence: string[];
  aiExplanation?: {
    explanation: string;
    possibleCauses: string[];
    recommendedAction: string;
    verificationChecklist: string[];
    confidence: number;
    generatedAt: Date;
  };
  assignedTo?: mongoose.Types.ObjectId;
  resolutionDetails?: {
    actionTaken: string;
    resolvedBy: mongoose.Types.ObjectId;
    resolvedAt: Date;
    notes: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MismatchCaseSchema = new Schema<IMismatchCase>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    runId: { type: Schema.Types.ObjectId, ref: 'ReconciliationRun', required: true, index: true },
    purchaseInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    gstr2bInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    supplierGstin: { type: String, required: true, uppercase: true, index: true },
    supplierName: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    matchType: {
      type: String,
      enum: [
        'EXACT_MATCH',
        'PROBABLE_MATCH_DATE',
        'PROBABLE_MATCH_FUZZY',
        'AMOUNT_MISMATCH',
        'TAX_MISMATCH',
        'MISSING_IN_GSTR2B',
        'MISSING_IN_PURCHASE_REGISTER',
        'DUPLICATE_CANDIDATE',
      ],
      required: true,
      index: true,
    },
    matchStage: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'AUTO_MATCHED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    priority: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM',
      index: true,
    },
    priorityReason: { type: String, default: '' },
    taxableDifference: { type: Number, default: 0 },
    totalDifference: { type: Number, default: 0 },
    taxDiscrepancy: { type: Number, default: 0 },
    differenceDetails: {
      taxableDiff: { type: Number, default: 0 },
      cgstDiff: { type: Number, default: 0 },
      sgstDiff: { type: Number, default: 0 },
      igstDiff: { type: Number, default: 0 },
      cessDiff: { type: Number, default: 0 },
      totalDiff: { type: Number, default: 0 },
      dateDiffDays: { type: Number, default: 0 },
    },
    evidence: [{ type: String }],
    aiExplanation: {
      explanation: { type: String },
      possibleCauses: [{ type: String }],
      recommendedAction: { type: String },
      verificationChecklist: [{ type: String }],
      confidence: { type: Number },
      generatedAt: { type: Date },
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionDetails: {
      actionTaken: { type: String },
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: { type: Date },
      notes: { type: String },
    },
  },
  { timestamps: true }
);

MismatchCaseSchema.index({ organizationId: 1, runId: 1, status: 1 });
MismatchCaseSchema.index({ organizationId: 1, priority: 1 });

export const MismatchCase = mongoose.model<IMismatchCase>('MismatchCase', MismatchCaseSchema);
