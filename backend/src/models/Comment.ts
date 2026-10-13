import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  organizationId: mongoose.Types.ObjectId;
  caseId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  commentText: string;
  attachments?: {
    fileName: string;
    fileUrl: string;
    fileSizeBytes: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    caseId: { type: Schema.Types.ObjectId, ref: 'MismatchCase', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    userRole: { type: String, required: true },
    commentText: { type: String, required: true, trim: true },
    attachments: [
      {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileSizeBytes: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
