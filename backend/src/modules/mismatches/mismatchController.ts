import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { MismatchCase, MismatchStatus } from '../../models/MismatchCase';
import { Comment } from '../../models/Comment';
import { AuditLog } from '../../models/AuditLog';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';

const updateStatusSchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'AUTO_MATCHED']),
  resolutionNotes: z.string().optional(),
  actionTaken: z.string().optional(),
});

const assignCaseSchema = z.object({
  assignedToUserId: z.string().min(1),
});

const addCommentSchema = z.object({
  commentText: z.string().min(1),
});

export class MismatchController {
  /**
   * Get complete details of a single mismatch case including associated invoices
   */
  static async getCaseById(req: Request, res: Response): Promise<void> {
    const caseItem = await MismatchCase.findOne({
      _id: req.params.caseId,
      organizationId: req.user!.organizationId,
    })
      .populate('purchaseInvoiceId')
      .populate('gstr2bInvoiceId')
      .populate('assignedTo', 'name email role')
      .populate('resolutionDetails.resolvedBy', 'name email');

    if (!caseItem) {
      res.status(404).json({ success: false, message: 'Mismatch case not found' });
      return;
    }

    const comments = await Comment.find({ caseId: caseItem._id }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      case: caseItem,
      comments,
    });
  }

  /**
   * Update resolution status of a case (e.g. mark RESOLVED or UNDER_REVIEW)
   */
  static async updateStatus(req: Request, res: Response): Promise<void> {
    const validated = updateStatusSchema.parse(req.body);

    const caseItem = await MismatchCase.findOne({
      _id: req.params.caseId,
      organizationId: req.user!.organizationId,
    });

    if (!caseItem) {
      res.status(404).json({ success: false, message: 'Mismatch case not found' });
      return;
    }

    const prevStatus = caseItem.status;
    caseItem.status = validated.status as MismatchStatus;

    if (validated.status === 'RESOLVED') {
      caseItem.resolutionDetails = {
        actionTaken: validated.actionTaken || 'Accepted after manual verification',
        resolvedBy: new mongoose.Types.ObjectId(req.user!.id),
        resolvedAt: new Date(),
        notes: validated.resolutionNotes || '',
      };
    }

    await caseItem.save();

    // Audit Log
    await AuditLog.create({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      action: 'UPDATE_MISMATCH_STATUS',
      resourceType: 'MismatchCase',
      resourceId: caseItem._id.toString(),
      beforeState: { status: prevStatus },
      afterState: { status: caseItem.status, resolution: caseItem.resolutionDetails },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(200).json({
      success: true,
      message: `Status updated to ${caseItem.status}`,
      case: caseItem,
    });
  }

  /**
   * Assign case to an accountant
   */
  static async assignCase(req: Request, res: Response): Promise<void> {
    const validated = assignCaseSchema.parse(req.body);

    const targetUser = await User.findOne({
      _id: validated.assignedToUserId,
      organizationId: req.user!.organizationId,
    });

    if (!targetUser) {
      res.status(404).json({ success: false, message: 'User to assign not found in organization' });
      return;
    }

    const caseItem = await MismatchCase.findOne({
      _id: req.params.caseId,
      organizationId: req.user!.organizationId,
    });

    if (!caseItem) {
      res.status(404).json({ success: false, message: 'Mismatch case not found' });
      return;
    }

    caseItem.assignedTo = targetUser._id as mongoose.Types.ObjectId;
    if (caseItem.status === 'PENDING_REVIEW') {
      caseItem.status = 'UNDER_REVIEW';
    }
    await caseItem.save();

    // Notify assigned user
    await Notification.create({
      organizationId: req.user!.organizationId,
      userId: targetUser._id,
      title: `Case Assigned: ${caseItem.invoiceNumber}`,
      message: `${req.user!.name} assigned mismatch case (${caseItem.supplierName}) to you.`,
      type: 'CASE_ASSIGNED',
      entityId: caseItem._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: `Assigned successfully to ${targetUser.name}`,
      case: caseItem,
    });
  }

  /**
   * Add a comment to the case
   */
  static async addComment(req: Request, res: Response): Promise<void> {
    const validated = addCommentSchema.parse(req.body);

    const caseItem = await MismatchCase.findOne({
      _id: req.params.caseId,
      organizationId: req.user!.organizationId,
    });

    if (!caseItem) {
      res.status(404).json({ success: false, message: 'Mismatch case not found' });
      return;
    }

    const comment = await Comment.create({
      organizationId: req.user!.organizationId,
      caseId: caseItem._id,
      userId: req.user!.id,
      userName: req.user!.name,
      userRole: req.user!.role,
      commentText: validated.commentText,
    });

    res.status(201).json({
      success: true,
      comment,
    });
  }
}
