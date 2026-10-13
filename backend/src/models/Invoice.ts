import mongoose, { Document, Schema } from 'mongoose';

export type InvoiceSourceDataset = 'PURCHASE_REGISTER' | 'GSTR_2B' | 'SUPPLIER_PORTAL';
export type DocumentType = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
export type ITCEligibility = 'ELIGIBLE' | 'INELIGIBLE';
export type InvoiceReconStatus = 'UNRECONCILED' | 'MATCHED' | 'MISMATCHED' | 'PENDING_REVIEW';

export interface IInvoice extends Document {
  organizationId: mongoose.Types.ObjectId;
  importJobId: mongoose.Types.ObjectId;
  sourceDataset: InvoiceSourceDataset;
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  normalizedInvoiceNumber: string;
  invoiceDate: Date;
  documentType: DocumentType;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalAmount: number;
  placeOfSupply?: string;
  reverseCharge: boolean;
  itcEligibility: ITCEligibility;
  filingPeriod?: string;
  reconciliationStatus: InvoiceReconStatus;
  rawMetadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    importJobId: { type: Schema.Types.ObjectId, ref: 'ImportJob', required: true, index: true },
    sourceDataset: {
      type: String,
      enum: ['PURCHASE_REGISTER', 'GSTR_2B', 'SUPPLIER_PORTAL'],
      required: true,
      index: true,
    },
    supplierGstin: { type: String, required: true, uppercase: true, trim: true, index: true },
    supplierName: { type: String, required: true, trim: true },
    invoiceNumber: { type: String, required: true, trim: true },
    normalizedInvoiceNumber: { type: String, required: true, uppercase: true, trim: true, index: true },
    invoiceDate: { type: Date, required: true, index: true },
    documentType: {
      type: String,
      enum: ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'],
      default: 'INVOICE',
      required: true,
    },
    taxableValue: { type: Number, required: true, default: 0 },
    cgst: { type: Number, required: true, default: 0 },
    sgst: { type: Number, required: true, default: 0 },
    igst: { type: Number, required: true, default: 0 },
    cess: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    placeOfSupply: { type: String },
    reverseCharge: { type: Boolean, default: false },
    itcEligibility: {
      type: String,
      enum: ['ELIGIBLE', 'INELIGIBLE'],
      default: 'ELIGIBLE',
    },
    filingPeriod: { type: String },
    reconciliationStatus: {
      type: String,
      enum: ['UNRECONCILED', 'MATCHED', 'MISMATCHED', 'PENDING_REVIEW'],
      default: 'UNRECONCILED',
      index: true,
    },
    rawMetadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound indexes for optimal tenant and matching engine query speed
InvoiceSchema.index({ organizationId: 1, sourceDataset: 1, supplierGstin: 1, normalizedInvoiceNumber: 1 });
InvoiceSchema.index({ organizationId: 1, filingPeriod: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
