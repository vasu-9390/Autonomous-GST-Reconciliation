import { Request, Response } from 'express';
import { MismatchCase } from '../../models/MismatchCase';
import { ReconciliationRun } from '../../models/ReconciliationRun';
import { CopilotService } from './copilotService';

export class CopilotController {
  /**
   * Explain a specific mismatch case
   */
  static async explainMismatch(req: Request, res: Response): Promise<void> {
    const { caseId } = req.body;
    if (!caseId) {
      res.status(400).json({ success: false, message: 'caseId is required' });
      return;
    }

    const mismatchCase = await MismatchCase.findOne({
      _id: caseId,
      organizationId: req.user!.organizationId,
    });

    if (!mismatchCase) {
      res.status(404).json({ success: false, message: 'Mismatch case not found' });
      return;
    }

    try {
      const explanationResult = await CopilotService.explainMismatch(mismatchCase);

      // Save to case record for persistent caching
      mismatchCase.aiExplanation = {
        explanation: explanationResult.explanation,
        possibleCauses: explanationResult.possibleCauses,
        recommendedAction: explanationResult.recommendedAction,
        verificationChecklist: explanationResult.verificationChecklist,
        confidence: explanationResult.confidence,
        generatedAt: new Date(),
      };
      await mismatchCase.save();

      res.status(200).json({
        success: true,
        data: explanationResult,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Failed to generate explanation: ${err.message}` });
    }
  }

  /**
   * Summarize a reconciliation run
   */
  static async summarizeRun(req: Request, res: Response): Promise<void> {
    const { runId } = req.body;
    if (!runId) {
      res.status(400).json({ success: false, message: 'runId is required' });
      return;
    }

    const run = await ReconciliationRun.findOne({
      _id: runId,
      organizationId: req.user!.organizationId,
    });

    if (!run) {
      res.status(404).json({ success: false, message: 'Run not found' });
      return;
    }

    const summary = {
      period: run.period,
      reconciledRate: `${run.reconciledPercentage}%`,
      totalPurchaseBills: run.totalPurchaseInvoices,
      totalGstr2bRecords: run.totalGstr2bInvoices,
      taxAtRisk: `₹${run.totalTaxAtRisk.toLocaleString('en-IN')}`,
      missingIn2b: run.missingIn2bCount,
      taxSplitMismatches: run.taxMismatchCount,
      amountMismatches: run.amountMismatchCount,
      keyInsight: run.totalTaxAtRisk > 0
        ? `Immediate action required: ₹${run.totalTaxAtRisk.toLocaleString('en-IN')} in Input Tax Credit is blocked or at risk across ${run.missingIn2bCount} unfiled supplier invoices and ${run.amountMismatchCount + run.taxMismatchCount} discrepancies.`
        : 'Reconciliation is healthy. Minimal tax risk identified across current purchase ledger records.',
    };

    res.status(200).json({ success: true, summary });
  }

  /**
   * Ask Copilot general or contextual questions
   */
  static async ask(req: Request, res: Response): Promise<void> {
    const { question, context } = req.body;
    if (!question || typeof question !== 'string') {
      res.status(400).json({ success: false, message: 'Question is required' });
      return;
    }

    try {
      const response = await CopilotService.askQuestion(question, context);
      res.status(200).json({ success: true, ...response });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Copilot error: ${err.message}` });
    }
  }
}
