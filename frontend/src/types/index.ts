export type UserRole = 'SUPER_ADMIN' | 'FINANCE_MANAGER' | 'ACCOUNTANT' | 'AUDITOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  organizationName?: string;
  organizationGstin?: string;
}

export interface OrganizationSettings {
  amountTolerance: number;
  taxTolerance: number;
  dateWindowDays: number;
  autoAssignAccountant?: string;
}

export interface Organization {
  id: string;
  name: string;
  gstin: string;
  pan: string;
  state: string;
  industry?: string;
  settings: OrganizationSettings;
}

export type DocumentType = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

export interface Invoice {
  _id: string;
  organizationId: string;
  importJobId: string;
  sourceDataset: 'PURCHASE_REGISTER' | 'GSTR_2B' | 'SUPPLIER_PORTAL';
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  normalizedInvoiceNumber: string;
  invoiceDate: string;
  documentType: DocumentType;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalAmount: number;
  placeOfSupply?: string;
  reverseCharge: boolean;
  itcEligibility: 'ELIGIBLE' | 'INELIGIBLE';
  filingPeriod?: string;
  reconciliationStatus: 'UNRECONCILED' | 'MATCHED' | 'MISMATCHED' | 'PENDING_REVIEW';
  createdAt: string;
}

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

export interface DifferenceDetails {
  taxableDiff: number;
  cgstDiff: number;
  sgstDiff: number;
  igstDiff: number;
  cessDiff: number;
  totalDiff: number;
  dateDiffDays: number;
}

export interface AIExplanation {
  explanation: string;
  possibleCauses: string[];
  recommendedAction: string;
  verificationChecklist: string[];
  supplierFollowUpTemplate?: string;
  confidence: number;
  generatedAt: string;
}

export interface MismatchCase {
  _id: string;
  organizationId: string;
  runId: string;
  purchaseInvoiceId?: Invoice;
  gstr2bInvoiceId?: Invoice;
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  matchType: MismatchType;
  matchStage: number;
  status: MismatchStatus;
  priority: MismatchPriority;
  priorityReason: string;
  taxableDifference: number;
  totalDifference: number;
  taxDiscrepancy: number;
  differenceDetails: DifferenceDetails;
  evidence: string[];
  aiExplanation?: AIExplanation;
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  resolutionDetails?: {
    actionTaken: string;
    resolvedBy?: {
      _id: string;
      name: string;
      email: string;
    };
    resolvedAt: string;
    notes: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationRun {
  _id: string;
  organizationId: string;
  initiatedBy: {
    _id: string;
    name: string;
    email: string;
  };
  period: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalPurchaseInvoices: number;
  totalGstr2bInvoices: number;
  exactMatchesCount: number;
  probableMatchesCount: number;
  amountMismatchCount: number;
  taxMismatchCount: number;
  missingIn2bCount: number;
  missingInPurchaseCount: number;
  duplicateCandidatesCount: number;
  totalTaxAtRisk: number;
  totalMatchedTax: number;
  reconciledPercentage: number;
  executionTimeMs: number;
  config: {
    amountTolerance: number;
    taxTolerance: number;
    dateWindowDays: number;
    fuzzyDistance: number;
  };
  createdAt: string;
}

export interface ImportJob {
  _id: string;
  fileName: string;
  datasetType: 'PURCHASE_REGISTER' | 'GSTR_2B' | 'SUPPLIER_PORTAL';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_FAILED';
  totalRows: number;
  importedRows: number;
  failedRows: number;
  duplicateRows: number;
  errors: {
    rowNumber: number;
    rawInvoiceNumber?: string;
    supplierGstin?: string;
    errorMessage: string;
  }[];
  createdAt: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  userName: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  beforeState?: any;
  afterState?: any;
  createdAt: string;
}

export interface CommentItem {
  _id: string;
  caseId: string;
  userName: string;
  userRole: string;
  commentText: string;
  createdAt: string;
}
