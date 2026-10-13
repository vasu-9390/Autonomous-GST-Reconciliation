import { Router } from 'express';
import { ReconciliationController } from './reconciliationController';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.post('/trigger', requireRoles(['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT']), ReconciliationController.triggerRun);
router.get('/runs', ReconciliationController.getRuns);
router.get('/runs/:runId', ReconciliationController.getRunById);
router.get('/cases', ReconciliationController.getCases);
router.get('/dashboard-metrics', ReconciliationController.getDashboardMetrics);

export default router;
