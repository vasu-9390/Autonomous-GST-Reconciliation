import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import { MismatchCase } from '../../models/MismatchCase';
import { ReconciliationRun } from '../../models/ReconciliationRun';

export class ReportController {
  /**
   * Summary report of reconciliation metrics
   */
  static async getSummaryReport(req: Request, res: Response): Promise<void> {
    const orgId = req.user!.organizationId;
    const runs = await ReconciliationRun.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(10);

    const statusCounts = await MismatchCase.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(orgId) } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalDiscrepancy: { $sum: '$taxDiscrepancy' } } },
    ]);

    const priorityCounts = await MismatchCase.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(orgId) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      success: true,
      reportGeneratedAt: new Date(),
      runs,
      statusCounts,
      priorityCounts,
    });
  }

  /**
   * Supplier-wise discrepancy ranking report
   */
  static async getSupplierVarianceReport(req: Request, res: Response): Promise<void> {
    const orgId = req.user!.organizationId;

    const supplierVariances = await MismatchCase.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(orgId) } },
      {
        $group: {
          _id: { gstin: '$supplierGstin', name: '$supplierName' },
          totalIssues: { $sum: 1 },
          totalTaxDiscrepancy: { $sum: '$taxDiscrepancy' },
          totalAmountDifference: { $sum: '$totalDifference' },
          criticalIssues: {
            $sum: { $cond: [{ $eq: ['$priority', 'CRITICAL'] }, 1, 0] },
          },
          missingIn2bCount: {
            $sum: { $cond: [{ $eq: ['$matchType', 'MISSING_IN_GSTR2B'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalTaxDiscrepancy: -1 } },
    ]);

    res.status(200).json({
      success: true,
      suppliers: supplierVariances.map((s) => ({
        supplierGstin: s._id.gstin,
        supplierName: s._id.name,
        totalIssues: s.totalIssues,
        totalTaxDiscrepancy: s.totalTaxDiscrepancy,
        totalAmountDifference: s.totalAmountDifference,
        criticalIssues: s.criticalIssues,
        missingIn2bCount: s.missingIn2bCount,
      })),
    });
  }

  /**
   * Export reconciliation mismatch cases as Excel/CSV workbook
   */
  static async exportReport(req: Request, res: Response): Promise<void> {
    const orgId = req.user!.organizationId;
    const { format = 'xlsx', runId, status } = req.query;

    const query: any = { organizationId: orgId };
    if (runId) query.runId = runId;
    if (status) query.status = status;

    const cases = await MismatchCase.find(query).sort({ priority: 1, createdAt: -1 });

    const exportRows = cases.map((c, index) => ({
      'S.No': index + 1,
      'Supplier GSTIN': c.supplierGstin,
      'Supplier Name': c.supplierName,
      'Invoice Number': c.invoiceNumber,
      'Match Type': c.matchType,
      'Match Stage': c.matchStage,
      'Status': c.status,
      'Priority': c.priority,
      'Priority Reason': c.priorityReason,
      'Tax Discrepancy (INR)': c.taxDiscrepancy.toFixed(2),
      'Total Difference (INR)': c.totalDifference.toFixed(2),
      'Taxable Difference (INR)': c.taxableDifference.toFixed(2),
      'CGST Diff (INR)': c.differenceDetails.cgstDiff.toFixed(2),
      'SGST Diff (INR)': c.differenceDetails.sgstDiff.toFixed(2),
      'IGST Diff (INR)': c.differenceDetails.igstDiff.toFixed(2),
      'Date Diff (Days)': c.differenceDetails.dateDiffDays,
      'Created At': c.createdAt.toISOString().split('T')[0],
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reconciliation Report');

    if (format === 'csv') {
      const csvBuffer = XLSX.write(workbook, { bookType: 'csv', type: 'buffer' });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="GST_Reconciliation_Report.csv"');
      res.send(csvBuffer);
    } else {
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="GST_Reconciliation_Report.xlsx"');
      res.send(excelBuffer);
    }
  }
}
