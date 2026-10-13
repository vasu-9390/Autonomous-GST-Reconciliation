import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' lacks sufficient privileges. Required: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};
