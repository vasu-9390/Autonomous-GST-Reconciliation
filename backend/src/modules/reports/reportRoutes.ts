import { Router } from 'express';
import { ReportController } from './reportController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/summary', ReportController.getSummaryReport);
router.get('/supplier-variance', ReportController.getSupplierVarianceReport);
router.get('/export', ReportController.exportReport);

export default router;
