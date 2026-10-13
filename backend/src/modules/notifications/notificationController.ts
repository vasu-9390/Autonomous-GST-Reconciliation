import { Request, Response } from 'express';
import { Notification } from '../../models/Notification';

export class NotificationController {
  static async listNotifications(req: Request, res: Response): Promise<void> {
    const orgId = req.user!.organizationId;
    const userId = req.user!.id;

    const notifications = await Notification.find({
      organizationId: orgId,
      $or: [{ userId }, { userId: { $exists: false } }, { userId: null }],
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      organizationId: orgId,
      isRead: false,
      $or: [{ userId }, { userId: { $exists: false } }, { userId: null }],
    });

    res.status(200).json({ success: true, unreadCount, notifications });
  }

  static async markAsRead(req: Request, res: Response): Promise<void> {
    await Notification.updateMany(
      {
        _id: req.params.id,
        organizationId: req.user!.organizationId,
      },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  }

  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    await Notification.updateMany(
      {
        organizationId: req.user!.organizationId,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  }
}
