import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 'HIGH_PRIORITY_MISMATCH' | 'IMPORT_COMPLETED' | 'IMPORT_FAILED' | 'CASE_ASSIGNED' | 'CASE_RESOLVED';

export interface INotification extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // null means org-wide
  title: string;
  message: string;
  type: NotificationType;
  entityId?: string; // e.g. caseId or runId
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['HIGH_PRIORITY_MISMATCH', 'IMPORT_COMPLETED', 'IMPORT_FAILED', 'CASE_ASSIGNED', 'CASE_RESOLVED'],
      required: true,
    },
    entityId: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
