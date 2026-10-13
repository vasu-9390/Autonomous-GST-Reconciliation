import mongoose, { Document, Schema } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  gstin: string;
  pan: string;
  state: string;
  industry?: string;
  settings: {
    amountTolerance: number;
    taxTolerance: number;
    dateWindowDays: number;
    autoAssignAccountant?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    gstin: { type: String, required: true, unique: true, uppercase: true, trim: true },
    pan: { type: String, required: true, uppercase: true, trim: true },
    state: { type: String, required: true, trim: true },
    industry: { type: String, default: 'General Commerce' },
    settings: {
      amountTolerance: { type: Number, default: 1.0 }, // default ₹1.00 tolerance
      taxTolerance: { type: Number, default: 1.0 },
      dateWindowDays: { type: Number, default: 30 },
      autoAssignAccountant: { type: String },
    },
  },
  { timestamps: true }
);

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
