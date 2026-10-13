import mongoose, { Document, Schema } from 'mongoose';

export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_FAILED';
export type ImportDatasetType = 'PURCHASE_REGISTER' | 'GSTR_2B' | 'SUPPLIER_PORTAL';

export interface IImportRowError {
  rowNumber: number;
  rawInvoiceNumber?: string;
  supplierGstin?: string;
  errorMessage: string;
  rawData?: Record<string, any>;
}

export interface IImportJob extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  datasetType: ImportDatasetType;
  fileName: string;
  fileSizeBytes: number;
  status: ImportStatus;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  duplicateRows: number;
  rowErrors: IImportRowError[];
  columnMapping?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    datasetType: {
      type: String,
      enum: ['PURCHASE_REGISTER', 'GSTR_2B', 'SUPPLIER_PORTAL'],
      required: true,
    },
    fileName: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_FAILED'],
      default: 'PENDING',
    },
    totalRows: { type: Number, default: 0 },
    importedRows: { type: Number, default: 0 },
    failedRows: { type: Number, default: 0 },
    duplicateRows: { type: Number, default: 0 },
    rowErrors: [
      {
        rowNumber: { type: Number, required: true },
        rawInvoiceNumber: { type: String },
        supplierGstin: { type: String },
        errorMessage: { type: String, required: true },
        rawData: { type: Schema.Types.Mixed },
      },
    ],
    columnMapping: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const ImportJob = mongoose.model<IImportJob>('ImportJob', ImportJobSchema);
