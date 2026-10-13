import { Router } from 'express';
import { OrganizationController } from './organizationController';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/', OrganizationController.getOrganization);
router.patch('/settings', requireRoles(['SUPER_ADMIN', 'FINANCE_MANAGER']), OrganizationController.updateSettings);
router.get('/members', OrganizationController.listMembers);
router.post('/members', requireRoles(['SUPER_ADMIN', 'FINANCE_MANAGER']), OrganizationController.createMember);

export default router;
