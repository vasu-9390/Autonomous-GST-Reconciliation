import { Router } from 'express';
import { AuditController } from './auditController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', AuditController.listAuditLogs);

export default router;
