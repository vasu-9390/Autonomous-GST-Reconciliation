import { Router } from 'express';
import { CopilotController } from './copilotController';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post('/explain-mismatch', CopilotController.explainMismatch);
router.post('/summarize-reconciliation', CopilotController.summarizeRun);
router.post('/ask', CopilotController.ask);

export default router;
