import { Router } from 'express';
import multer from 'multer';
import { ImportController } from './importController';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { config } from '../../config';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadSizeBytes },
  fileFilter: (_req, file, cb) => {
    const isCsvOrExcel =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls');

    if (isCsvOrExcel) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel (.xlsx, .xls) files are supported'));
    }
  },
});

router.use(authenticateToken);

router.post('/preview', upload.single('file'), ImportController.previewFile);
router.post(
  '/execute',
  requireRoles(['SUPER_ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT']),
  upload.single('file'),
  ImportController.executeImport
);
router.get('/jobs', ImportController.listImportJobs);
router.get('/jobs/:jobId', ImportController.getImportJob);

export default router;
