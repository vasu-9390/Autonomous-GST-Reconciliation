import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ImportParser } from './importParser';
import { ImportJob, ImportDatasetType } from '../../models/ImportJob';
import { Invoice } from '../../models/Invoice';
import { AuditLog } from '../../models/AuditLog';
import { Notification } from '../../models/Notification';

export class ImportController {
  /**
   * Parse uploaded file and return headers, sample rows, and suggested mappings
   */
  static async previewFile(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    try {
      const rows = await ImportParser.parseBufferToRows(req.file.buffer, req.file.originalname);
      if (!rows || rows.length === 0) {
        res.status(400).json({ success: false, message: 'Uploaded file contains no rows or is empty' });
        return;
      }

      const headers = Object.keys(rows[0]);
      const suggestedMapping = ImportParser.autoDetectColumnMapping(headers);
      const previewRows = rows.slice(0, 5);

      res.status(200).json({
        success: true,
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
        totalRowsCount: rows.length,
        headers,
        suggestedMapping,
        previewRows,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Failed to inspect file: ${err.message}` });
    }
  }

  /**
   * Execute full import with user-approved column mappings
   */
  static async executeImport(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const datasetType = (req.body.datasetType || 'PURCHASE_REGISTER') as ImportDatasetType;
    let columnMapping: Record<string, string> = {};
    if (req.body.columnMapping) {
      try {
        columnMapping = typeof req.body.columnMapping === 'string'
          ? JSON.parse(req.body.columnMapping)
          : req.body.columnMapping;
      } catch {
        columnMapping = {};
      }
    }

    try {
      const rows = await ImportParser.parseBufferToRows(req.file.buffer, req.file.originalname);
      if (!rows || rows.length === 0) {
        res.status(400).json({ success: false, message: 'Uploaded file is empty' });
        return;
      }

      // If mapping was not provided, auto-detect
      if (Object.keys(columnMapping).length === 0) {
        const headers = Object.keys(rows[0]);
        columnMapping = ImportParser.autoDetectColumnMapping(headers);
      }

      // Process & validate rows
      const { validInvoices, errors, duplicateCount } = ImportParser.processRows(rows, columnMapping);

      const orgId = req.user!.organizationId;
      const userId = new mongoose.Types.ObjectId(req.user!.id);

      // Create ImportJob record
      const importJob = await ImportJob.create({
        organizationId: orgId,
        userId,
        datasetType,
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
        status: errors.length === 0 ? 'COMPLETED' : validInvoices.length > 0 ? 'PARTIALLY_FAILED' : 'FAILED',
        totalRows: rows.length,
        importedRows: validInvoices.length,
        failedRows: errors.length,
        duplicateRows: duplicateCount,
        rowErrors: errors,
        columnMapping,
      });

      // Insert valid invoices into the database
      if (validInvoices.length > 0) {
        const invoiceDocs = validInvoices.map((inv) => ({
          ...inv,
          organizationId: orgId,
          importJobId: importJob._id,
          sourceDataset: datasetType,
          reconciliationStatus: 'UNRECONCILED',
        }));

        await Invoice.insertMany(invoiceDocs, { ordered: false });
      }

      // Create Audit Log
      await AuditLog.create({
        organizationId: orgId,
        userId,
        userName: req.user!.name,
        userRole: req.user!.role,
        action: 'IMPORT_GST_DATA',
        resourceType: 'ImportJob',
        resourceId: importJob._id.toString(),
        afterState: {
          fileName: req.file.originalname,
          datasetType,
          imported: validInvoices.length,
          failed: errors.length,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Create Notification
      await Notification.create({
        organizationId: orgId,
        userId,
        title: `Import Completed: ${req.file.originalname}`,
        message: `Imported ${validInvoices.length} invoices successfully (${errors.length} failed/skipped).`,
        type: errors.length > 0 ? 'IMPORT_FAILED' : 'IMPORT_COMPLETED',
        entityId: importJob._id.toString(),
      });

      res.status(201).json({
        success: true,
        message: `Successfully processed ${rows.length} rows (${validInvoices.length} imported, ${errors.length} errors).`,
        importJob: {
          id: importJob._id,
          status: importJob.status,
          totalRows: importJob.totalRows,
          importedRows: importJob.importedRows,
          failedRows: importJob.failedRows,
          duplicateRows: importJob.duplicateRows,
          errorsCount: errors.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Import execution failed: ${err.message}` });
    }
  }

  /**
   * List all import jobs for the organization
   */
  static async listImportJobs(req: Request, res: Response): Promise<void> {
    const jobs = await ImportJob.find({ organizationId: req.user!.organizationId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, jobs });
  }

  /**
   * Get single import job with error list
   */
  static async getImportJob(req: Request, res: Response): Promise<void> {
    const job = await ImportJob.findOne({
      _id: req.params.jobId,
      organizationId: req.user!.organizationId,
    }).populate('userId', 'name email');

    if (!job) {
      res.status(404).json({ success: false, message: 'Import job not found' });
      return;
    }

    res.status(200).json({ success: true, job });
  }
}
