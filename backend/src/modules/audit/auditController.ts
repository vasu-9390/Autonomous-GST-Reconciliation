import { Request, Response } from 'express';
import { AuditLog } from '../../models/AuditLog';

export class AuditController {
  static async listAuditLogs(req: Request, res: Response): Promise<void> {
    const { action, resourceType, page = '1', limit = '50' } = req.query;

    const query: any = { organizationId: req.user!.organizationId };
    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      logs,
    });
  }
}
