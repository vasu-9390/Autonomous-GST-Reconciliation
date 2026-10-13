import mongoose from 'mongoose';
import { IInvoice, Invoice } from '../../models/Invoice';
import { IMismatchCase, MismatchCase, MismatchType, MismatchStatus } from '../../models/MismatchCase';
import { IReconciliationRun, ReconciliationRun } from '../../models/ReconciliationRun';
import { DecimalUtil } from '../../utils/decimal';
import { DateUtil } from '../../utils/date';
import { InvoiceNumberUtil } from '../../utils/invoiceNumber';
import { PriorityScorer } from './priorityScorer';

export interface ReconciliationEngineOptions {
  organizationId: mongoose.Types.ObjectId;
  initiatedBy: mongoose.Types.ObjectId;
  period?: string;
  amountTolerance?: number; // e.g. ₹1.00
  taxTolerance?: number;    // e.g. ₹1.00
  dateWindowDays?: number;  // e.g. 30 days
  fuzzyDistance?: number;   // e.g. 2
}

export class ReconciliationEngine {
  /**
   * Execute deterministic 10-stage reconciliation run
   */
  static async run(options: ReconciliationEngineOptions): Promise<IReconciliationRun> {
    const startTime = Date.now();
    const {
      organizationId,
      initiatedBy,
      period = 'All Invoices',
      amountTolerance = 1.0,
      taxTolerance = 1.0,
      dateWindowDays = 30,
      fuzzyDistance = 2,
    } = options;

    // Fetch invoices for this organization
    const invoiceQuery: any = { organizationId };
    if (period && period !== 'All Invoices') {
      invoiceQuery.filingPeriod = period;
    }

    const [purchaseInvoices, gstr2bInvoices] = await Promise.all([
      Invoice.find({ ...invoiceQuery, sourceDataset: 'PURCHASE_REGISTER' }).lean(),
      Invoice.find({ ...invoiceQuery, sourceDataset: 'GSTR_2B' }).lean(),
    ]);

    // Create initial ReconciliationRun entry
    const reconRun = new ReconciliationRun({
      organizationId,
      initiatedBy,
      period,
      status: 'RUNNING',
      totalPurchaseInvoices: purchaseInvoices.length,
      totalGstr2bInvoices: gstr2bInvoices.length,
      config: {
        amountTolerance,
        taxTolerance,
        dateWindowDays,
        fuzzyDistance,
      },
    });
    await reconRun.save();

    // Data structures for tracking matching
    const matchedPurchaseIds = new Set<string>();
    const matchedGstr2bIds = new Set<string>();
    const casesToInsert: Partial<IMismatchCase>[] = [];

    let exactMatchesCount = 0;
    let probableMatchesCount = 0;
    let amountMismatchCount = 0;
    let taxMismatchCount = 0;
    let missingIn2bCount = 0;
    let missingInPurchaseCount = 0;
    let duplicateCandidatesCount = 0;

    let totalTaxAtRisk = 0;
    let totalMatchedTax = 0;

    // -------------------------------------------------------------
    // Stage 10 (Prep): Check Duplicate Candidates within datasets
    // -------------------------------------------------------------
    const checkDuplicates = (invoices: any[], datasetName: string) => {
      const tracker = new Map<string, any[]>();
      invoices.forEach((inv) => {
        const key = `${inv.supplierGstin}_${inv.normalizedInvoiceNumber}`;
        if (!tracker.has(key)) tracker.set(key, []);
        tracker.get(key)!.push(inv);
      });

      for (const [_, duplicates] of tracker.entries()) {
        if (duplicates.length > 1) {
          duplicateCandidatesCount += duplicates.length;
          duplicates.forEach((dup) => {
            const taxTotal = DecimalUtil.add(dup.cgst, DecimalUtil.add(dup.sgst, dup.igst));
            totalTaxAtRisk = DecimalUtil.add(totalTaxAtRisk, taxTotal);

            const score = PriorityScorer.calculate('DUPLICATE_CANDIDATE', taxTotal, 0, dup.totalAmount, true);

            casesToInsert.push({
              organizationId,
              runId: reconRun._id as mongoose.Types.ObjectId,
              purchaseInvoiceId: datasetName === 'PURCHASE_REGISTER' ? dup._id : undefined,
              gstr2bInvoiceId: datasetName === 'GSTR_2B' ? dup._id : undefined,
              supplierGstin: dup.supplierGstin,
              supplierName: dup.supplierName,
              invoiceNumber: dup.invoiceNumber,
              matchType: 'DUPLICATE_CANDIDATE',
              matchStage: 10,
              status: 'PENDING_REVIEW',
              priority: score.priority,
              priorityReason: score.priorityReason,
              taxableDifference: dup.taxableValue,
              totalDifference: dup.totalAmount,
              taxDiscrepancy: taxTotal,
              differenceDetails: {
                taxableDiff: dup.taxableValue,
                cgstDiff: dup.cgst,
                sgstDiff: dup.sgst,
                igstDiff: dup.igst,
                cessDiff: dup.cess,
                totalDiff: dup.totalAmount,
                dateDiffDays: 0,
              },
              evidence: [
                `Multiple entries found in ${datasetName} with invoice number ${dup.invoiceNumber}`,
                `Supplier GSTIN: ${dup.supplierGstin}`,
                `Entry amount: ₹${dup.totalAmount.toFixed(2)}`,
              ],
            });
          });
        }
      }
    };

    checkDuplicates(purchaseInvoices, 'PURCHASE_REGISTER');

    // -------------------------------------------------------------
    // Stages 1 to 7: Compare Purchase Invoices with GSTR-2B
    // -------------------------------------------------------------
    for (const pr of purchaseInvoices) {
      if (matchedPurchaseIds.has(pr._id.toString())) continue;

      const prTaxTotal = DecimalUtil.add(pr.cgst, DecimalUtil.add(pr.sgst, pr.igst));

      // Candidate search in GSTR-2B
      // Find candidate by same supplier GSTIN
      const candidate2bList = gstr2bInvoices.filter(
        (g2b) => !matchedGstr2bIds.has(g2b._id.toString()) && g2b.supplierGstin === pr.supplierGstin
      );

      let matchedCase: {
        candidate: any;
        matchType: MismatchType;
        matchStage: number;
        status: MismatchStatus;
        evidence: string[];
      } | null = null;

      for (const g2b of candidate2bList) {
        const isInvoiceNoExact = pr.normalizedInvoiceNumber === g2b.normalizedInvoiceNumber;
        const totalDiff = DecimalUtil.diff(pr.totalAmount, g2b.totalAmount);
        const taxableDiff = DecimalUtil.diff(pr.taxableValue, g2b.taxableValue);
        const g2bTaxTotal = DecimalUtil.add(g2b.cgst, DecimalUtil.add(g2b.sgst, g2b.igst));
        const taxDiff = DecimalUtil.diff(prTaxTotal, g2bTaxTotal);
        const daysDiff = DateUtil.daysDiff(new Date(pr.invoiceDate), new Date(g2b.invoiceDate));

        // STAGE 1: Exact Match (Exact invoice number, exact date, exact amounts within 0.05)
        if (
          isInvoiceNoExact &&
          daysDiff === 0 &&
          totalDiff <= 0.05 &&
          taxableDiff <= 0.05 &&
          taxDiff <= 0.05
        ) {
          matchedCase = {
            candidate: g2b,
            matchType: 'EXACT_MATCH',
            matchStage: 1,
            status: 'AUTO_MATCHED',
            evidence: [
              'Supplier GSTIN matched exactly',
              `Invoice number "${pr.invoiceNumber}" normalized match`,
              'Invoice date matched exactly',
              `Amounts matched: ₹${pr.totalAmount.toFixed(2)}`,
            ],
          };
          break;
        }

        // STAGE 2: Date-Tolerance Match (Invoice # and amounts match, date within window)
        if (
          isInvoiceNoExact &&
          daysDiff > 0 &&
          daysDiff <= dateWindowDays &&
          totalDiff <= amountTolerance &&
          taxDiff <= taxTolerance
        ) {
          matchedCase = {
            candidate: g2b,
            matchType: 'PROBABLE_MATCH_DATE',
            matchStage: 2,
            status: 'PENDING_REVIEW',
            evidence: [
              `Invoice number and amounts matched within tolerance`,
              `Date shifted by ${daysDiff} days (PR: ${DateUtil.toISODate(new Date(pr.invoiceDate))}, 2B: ${DateUtil.toISODate(new Date(g2b.invoiceDate))})`,
            ],
          };
          break;
        }

        // STAGE 3: Amount Tolerance Match (Invoice # and date match, total within tolerance)
        if (
          isInvoiceNoExact &&
          daysDiff <= 5 &&
          totalDiff > 0.05 &&
          totalDiff <= amountTolerance
        ) {
          matchedCase = {
            candidate: g2b,
            matchType: 'EXACT_MATCH',
            matchStage: 3,
            status: 'AUTO_MATCHED',
            evidence: [
              `Invoice number matched exactly`,
              `Minor rounding variance of ₹${totalDiff.toFixed(2)} within configured tolerance of ₹${amountTolerance.toFixed(2)}`,
            ],
          };
          break;
        }

        // STAGE 4: Fuzzy Invoice Number Match (GSTIN & total match, invoice string distance <= fuzzyDistance)
        if (
          totalDiff <= 0.05 &&
          daysDiff <= dateWindowDays &&
          InvoiceNumberUtil.levenshteinDistance(pr.normalizedInvoiceNumber, g2b.normalizedInvoiceNumber) <= fuzzyDistance
        ) {
          matchedCase = {
            candidate: g2b,
            matchType: 'PROBABLE_MATCH_FUZZY',
            matchStage: 4,
            status: 'PENDING_REVIEW',
            evidence: [
              `Supplier GSTIN and Total Amount (₹${pr.totalAmount.toFixed(2)}) match exactly`,
              `Fuzzy invoice match: PR "${pr.invoiceNumber}" vs GSTR-2B "${g2b.invoiceNumber}"`,
            ],
          };
          break;
        }

        // STAGE 5: Tax Split Mismatch (Total amount matches, but IGST vs CGST+SGST conflict)
        const isIgstPr = pr.igst > 0 && pr.cgst === 0 && pr.sgst === 0;
        const isCgstG2b = g2b.cgst > 0 && g2b.sgst > 0 && g2b.igst === 0;
        const isIgstG2b = g2b.igst > 0 && g2b.cgst === 0 && g2b.sgst === 0;
        const isCgstPr = pr.cgst > 0 && pr.sgst > 0 && pr.igst === 0;

        if (
          isInvoiceNoExact &&
          totalDiff <= amountTolerance &&
          ((isIgstPr && isCgstG2b) || (isCgstPr && isIgstG2b))
        ) {
          matchedCase = {
            candidate: g2b,
            matchType: 'TAX_MISMATCH',
            matchStage: 5,
            status: 'PENDING_REVIEW',
            evidence: [
              `Total invoice amount matches: ₹${pr.totalAmount.toFixed(2)}`,
              isIgstPr
                ? `PR booked as IGST (₹${pr.igst.toFixed(2)}), but GSTR-2B filed as CGST (₹${g2b.cgst.toFixed(2)}) + SGST (₹${g2b.sgst.toFixed(2)})`
                : `PR booked as CGST/SGST, but GSTR-2B filed as IGST (₹${g2b.igst.toFixed(2)})`,
              'Potential Place of Supply (POS) classification error',
            ],
          };
          break;
        }

        // STAGE 6 & 7: Taxable Value or Tax Component Variance (Invoice # matches, amounts differ)
        if (isInvoiceNoExact && (totalDiff > amountTolerance || taxableDiff > amountTolerance || taxDiff > taxTolerance)) {
          const isTaxVariance = taxDiff > taxTolerance;
          matchedCase = {
            candidate: g2b,
            matchType: isTaxVariance ? 'TAX_MISMATCH' : 'AMOUNT_MISMATCH',
            matchStage: isTaxVariance ? 7 : 6,
            status: 'PENDING_REVIEW',
            evidence: [
              `Invoice number matched: ${pr.invoiceNumber}`,
              `Taxable value difference: ₹${taxableDiff.toFixed(2)} (PR: ₹${pr.taxableValue.toFixed(2)}, 2B: ₹${g2b.taxableValue.toFixed(2)})`,
              `Tax component difference: ₹${taxDiff.toFixed(2)} (PR Tax: ₹${prTaxTotal.toFixed(2)}, 2B Tax: ₹${g2bTaxTotal.toFixed(2)})`,
              `Total amount difference: ₹${totalDiff.toFixed(2)}`,
            ],
          };
          break;
        }
      }

      if (matchedCase) {
        const g2b = matchedCase.candidate;
        matchedPurchaseIds.add(pr._id.toString());
        matchedGstr2bIds.add(g2b._id.toString());

        const totalDiff = DecimalUtil.diff(pr.totalAmount, g2b.totalAmount);
        const taxableDiff = DecimalUtil.diff(pr.taxableValue, g2b.taxableValue);
        const g2bTaxTotal = DecimalUtil.add(g2b.cgst, DecimalUtil.add(g2b.sgst, g2b.igst));
        const taxDiff = DecimalUtil.diff(prTaxTotal, g2bTaxTotal);
        const daysDiff = DateUtil.daysDiff(new Date(pr.invoiceDate), new Date(g2b.invoiceDate));

        const priorityResult = PriorityScorer.calculate(
          matchedCase.matchType,
          taxDiff,
          totalDiff,
          pr.totalAmount
        );

        if (matchedCase.matchType === 'EXACT_MATCH') {
          exactMatchesCount++;
          totalMatchedTax = DecimalUtil.add(totalMatchedTax, prTaxTotal);
        } else if (matchedCase.matchType.startsWith('PROBABLE_MATCH')) {
          probableMatchesCount++;
          totalMatchedTax = DecimalUtil.add(totalMatchedTax, prTaxTotal);
        } else if (matchedCase.matchType === 'AMOUNT_MISMATCH') {
          amountMismatchCount++;
          totalTaxAtRisk = DecimalUtil.add(totalTaxAtRisk, taxDiff);
        } else if (matchedCase.matchType === 'TAX_MISMATCH') {
          taxMismatchCount++;
          totalTaxAtRisk = DecimalUtil.add(totalTaxAtRisk, taxDiff);
        }

        casesToInsert.push({
          organizationId,
          runId: reconRun._id as mongoose.Types.ObjectId,
          purchaseInvoiceId: pr._id,
          gstr2bInvoiceId: g2b._id,
          supplierGstin: pr.supplierGstin,
          supplierName: pr.supplierName,
          invoiceNumber: pr.invoiceNumber,
          matchType: matchedCase.matchType,
          matchStage: matchedCase.matchStage,
          status: matchedCase.status,
          priority: priorityResult.priority,
          priorityReason: priorityResult.priorityReason,
          taxableDifference: taxableDiff,
          totalDifference: totalDiff,
          taxDiscrepancy: taxDiff,
          differenceDetails: {
            taxableDiff,
            cgstDiff: DecimalUtil.diff(pr.cgst, g2b.cgst),
            sgstDiff: DecimalUtil.diff(pr.sgst, g2b.sgst),
            igstDiff: DecimalUtil.diff(pr.igst, g2b.igst),
            cessDiff: DecimalUtil.diff(pr.cess, g2b.cess),
            totalDiff,
            dateDiffDays: daysDiff,
          },
          evidence: matchedCase.evidence,
        });
      } else {
        // STAGE 8: Missing in GSTR-2B (In purchase register, but supplier has not filed in 2B)
        missingIn2bCount++;
        totalTaxAtRisk = DecimalUtil.add(totalTaxAtRisk, prTaxTotal);

        const priorityResult = PriorityScorer.calculate('MISSING_IN_GSTR2B', prTaxTotal, pr.totalAmount, pr.totalAmount);

        casesToInsert.push({
          organizationId,
          runId: reconRun._id as mongoose.Types.ObjectId,
          purchaseInvoiceId: pr._id,
          supplierGstin: pr.supplierGstin,
          supplierName: pr.supplierName,
          invoiceNumber: pr.invoiceNumber,
          matchType: 'MISSING_IN_GSTR2B',
          matchStage: 8,
          status: 'PENDING_REVIEW',
          priority: priorityResult.priority,
          priorityReason: priorityResult.priorityReason,
          taxableDifference: pr.taxableValue,
          totalDifference: pr.totalAmount,
          taxDiscrepancy: prTaxTotal,
          differenceDetails: {
            taxableDiff: pr.taxableValue,
            cgstDiff: pr.cgst,
            sgstDiff: pr.sgst,
            igstDiff: pr.igst,
            cessDiff: pr.cess,
            totalDiff: pr.totalAmount,
            dateDiffDays: 0,
          },
          evidence: [
            `Recorded in Purchase Register with date ${DateUtil.toISODate(new Date(pr.invoiceDate))}`,
            `No corresponding invoice found in supplier's GSTR-2B return`,
            `Input Tax Credit of ₹${prTaxTotal.toFixed(2)} cannot be claimed until supplier files GSTR-1`,
          ],
        });
      }
    }

    // -------------------------------------------------------------
    // STAGE 9: Missing in Purchase Register
    // (Present in GSTR-2B, but not entered into accounting books)
    // -------------------------------------------------------------
    for (const g2b of gstr2bInvoices) {
      if (matchedGstr2bIds.has(g2b._id.toString())) continue;

      missingInPurchaseCount++;
      const g2bTaxTotal = DecimalUtil.add(g2b.cgst, DecimalUtil.add(g2b.sgst, g2b.igst));

      const priorityResult = PriorityScorer.calculate(
        'MISSING_IN_PURCHASE_REGISTER',
        g2bTaxTotal,
        g2b.totalAmount,
        g2b.totalAmount
      );

      casesToInsert.push({
        organizationId,
        runId: reconRun._id as mongoose.Types.ObjectId,
        gstr2bInvoiceId: g2b._id,
        supplierGstin: g2b.supplierGstin,
        supplierName: g2b.supplierName,
        invoiceNumber: g2b.invoiceNumber,
        matchType: 'MISSING_IN_PURCHASE_REGISTER',
        matchStage: 9,
        status: 'PENDING_REVIEW',
        priority: priorityResult.priority,
        priorityReason: priorityResult.priorityReason,
        taxableDifference: g2b.taxableValue,
        totalDifference: g2b.totalAmount,
        taxDiscrepancy: g2bTaxTotal,
        differenceDetails: {
          taxableDiff: g2b.taxableValue,
          cgstDiff: g2b.cgst,
          sgstDiff: g2b.sgst,
          igstDiff: g2b.igst,
          cessDiff: g2b.cess,
          totalDiff: g2b.totalAmount,
          dateDiffDays: 0,
        },
        evidence: [
          `Appears in GSTR-2B filing under period ${g2b.filingPeriod || 'Current'}`,
          `No matching entry found in internal Purchase Register`,
          `Opportunity to claim ₹${g2bTaxTotal.toFixed(2)} ITC upon recording bill in books`,
        ],
      });
    }

    // Batch insert all mismatch cases
    if (casesToInsert.length > 0) {
      await MismatchCase.insertMany(casesToInsert);
    }

    // Update invoice reconciliationStatus
    const matchedInvoiceIds = Array.from(matchedPurchaseIds).concat(Array.from(matchedGstr2bIds));
    if (matchedInvoiceIds.length > 0) {
      await Invoice.updateMany({ _id: { $in: matchedInvoiceIds } }, { $set: { reconciliationStatus: 'MATCHED' } });
    }

    const mismatchedPurchaseIds = purchaseInvoices
      .filter((p) => !matchedPurchaseIds.has(p._id.toString()))
      .map((p) => p._id);
    if (mismatchedPurchaseIds.length > 0) {
      await Invoice.updateMany({ _id: { $in: mismatchedPurchaseIds } }, { $set: { reconciliationStatus: 'MISMATCHED' } });
    }

    // Calculate completion metrics
    const totalCompared = purchaseInvoices.length + gstr2bInvoices.length;
    const totalMatchedCount = (exactMatchesCount + probableMatchesCount) * 2;
    const reconciledPercentage = totalCompared > 0
      ? Math.min(100, Math.round((totalMatchedCount / totalCompared) * 100))
      : 0;

    const executionTimeMs = Date.now() - startTime;

    // Update run record
    reconRun.status = 'COMPLETED';
    reconRun.exactMatchesCount = exactMatchesCount;
    reconRun.probableMatchesCount = probableMatchesCount;
    reconRun.amountMismatchCount = amountMismatchCount;
    reconRun.taxMismatchCount = taxMismatchCount;
    reconRun.missingIn2bCount = missingIn2bCount;
    reconRun.missingInPurchaseCount = missingInPurchaseCount;
    reconRun.duplicateCandidatesCount = duplicateCandidatesCount;
    reconRun.totalTaxAtRisk = totalTaxAtRisk;
    reconRun.totalMatchedTax = totalMatchedTax;
    reconRun.reconciledPercentage = reconciledPercentage;
    reconRun.executionTimeMs = executionTimeMs;

    await reconRun.save();
    return reconRun;
  }
}
