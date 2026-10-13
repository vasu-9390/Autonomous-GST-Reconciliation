import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/authRoutes';
import organizationRoutes from './modules/organizations/organizationRoutes';
import importRoutes from './modules/imports/importRoutes';
import reconciliationRoutes from './modules/reconciliation/reconciliationRoutes';
import mismatchRoutes from './modules/mismatches/mismatchRoutes';
import copilotRoutes from './modules/copilot/copilotRoutes';
import reportRoutes from './modules/reports/reportRoutes';
import notificationRoutes from './modules/notifications/notificationRoutes';
import auditRoutes from './modules/audit/auditRoutes';

const app = express();

// Security and standard middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost or requests without origin (like curl/testing)
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    environment: config.env,
    service: 'Autonomous GST Reconciliation & Mismatch Copilot Backend',
  });
});

// Mount versioned REST API v1
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/imports', importRoutes);
app.use('/api/v1/reconciliations', reconciliationRoutes);
app.use('/api/v1/mismatches', mismatchRoutes);
app.use('/api/v1/copilot', copilotRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/audit', auditRoutes);

// Central error handler
app.use(errorHandler);

export default app;
