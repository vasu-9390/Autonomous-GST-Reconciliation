import { Router } from 'express';
import { MismatchController } from './mismatchController';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/:caseId', MismatchController.getCaseById);
router.patch(
  '/:caseId/status',
  requireRoles(['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT']),
  MismatchController.updateStatus
);
router.post(
  '/:caseId/assign',
  requireRoles(['SUPER_ADMIN', 'FINANCE_MANAGER']),
  MismatchController.assignCase
);
router.post(
  '/:caseId/comments',
  requireRoles(['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT']),
  MismatchController.addComment
);

export default router;
