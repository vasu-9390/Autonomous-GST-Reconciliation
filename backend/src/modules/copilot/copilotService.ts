import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { config } from '../../config';
import { IMismatchCase } from '../../models/MismatchCase';

export const AIExplanationSchema = z.object({
  explanation: z.string(),
  possibleCauses: z.array(z.string()),
  recommendedAction: z.string(),
  verificationChecklist: z.array(z.string()),
  supplierFollowUpTemplate: z.string(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(1),
  disclaimer: z.string(),
});

export type AIExplanationResult = z.infer<typeof AIExplanationSchema>;

export class CopilotService {
  private static genAI: GoogleGenerativeAI | null = null;

  private static getGeminiClient(): GoogleGenerativeAI | null {
    if (!CopilotService.genAI && config.geminiApiKey) {
      CopilotService.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    }
    return CopilotService.genAI;
  }

  /**
   * Explain a specific mismatch case with AI + strict deterministic fallback
   */
  static async explainMismatch(mismatchCase: IMismatchCase): Promise<AIExplanationResult> {
    const gemini = CopilotService.getGeminiClient();

    if (!gemini) {
      console.log('ℹ️ [Copilot] No GEMINI_API_KEY provided. Using deterministic financial compliance fallback.');
      return CopilotService.getDeterministicFallback(mismatchCase);
    }

    try {
      const model = gemini.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2, // Low temperature for factual compliance reasoning
        },
      });

      const prompt = `You are an expert Indian Goods and Services Tax (GST) compliance copilot.
Analyze this invoice mismatch case deterministically.
Do NOT fabricate numbers, amounts, or tax rates. Rely strictly on the following verified facts:

Case Context:
- Supplier: ${mismatchCase.supplierName} (GSTIN: ${mismatchCase.supplierGstin})
- Invoice Number: ${mismatchCase.invoiceNumber}
- Match Classification: ${mismatchCase.matchType} (Stage ${mismatchCase.matchStage})
- Computed Tax Difference: ₹${mismatchCase.taxDiscrepancy.toFixed(2)}
- Computed Total Amount Difference: ₹${mismatchCase.totalDifference.toFixed(2)}
- Computed Taxable Value Difference: ₹${mismatchCase.taxableDifference.toFixed(2)}
- Component Variances:
  * CGST Diff: ₹${mismatchCase.differenceDetails.cgstDiff.toFixed(2)}
  * SGST Diff: ₹${mismatchCase.differenceDetails.sgstDiff.toFixed(2)}
  * IGST Diff: ₹${mismatchCase.differenceDetails.igstDiff.toFixed(2)}
  * Cess Diff: ₹${mismatchCase.differenceDetails.cessDiff.toFixed(2)}
  * Date Difference: ${mismatchCase.differenceDetails.dateDiffDays} days
- Evidence Points:
  ${mismatchCase.evidence.map((e) => `* ${e}`).join('\n')}

Produce a valid JSON object matching this schema:
{
  "explanation": "Clear plain-English explanation of why this mismatch occurred under Indian GST rules",
  "possibleCauses": ["List of realistic reasons: e.g. supplier unfiled GSTR-1, QRMP scheme delay, place of supply misclassification, discount omitted in books, rounding"],
  "recommendedAction": "Concrete immediate step for the finance accountant",
  "verificationChecklist": ["Step 1", "Step 2", "Step 3"],
  "supplierFollowUpTemplate": "A concise, polite professional email draft to send to the vendor requesting rectification or GSTR-1 amendment",
  "riskLevel": "LOW | MEDIUM | HIGH | CRITICAL",
  "confidence": 0.95,
  "disclaimer": "This explanation is advisory for accounting review and does not constitute formal legal tax counsel."
}`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      const validated = AIExplanationSchema.parse(parsed);
      return validated;
    } catch (err: any) {
      console.warn(`⚠️ [Copilot] Gemini API call failed (${err.message}). Using deterministic fallback.`);
      return CopilotService.getDeterministicFallback(mismatchCase);
    }
  }

  /**
   * Deterministic, rule-based fallback when AI is unavailable or offline
   */
  static getDeterministicFallback(mismatchCase: IMismatchCase): AIExplanationResult {
    const { matchType, supplierName, supplierGstin, invoiceNumber, taxDiscrepancy, totalDifference, priority } = mismatchCase;

    let explanation = '';
    const possibleCauses: string[] = [];
    let recommendedAction = '';
    const checklist: string[] = [];
    let template = '';

    switch (matchType) {
      case 'MISSING_IN_GSTR2B':
        explanation = `Invoice ${invoiceNumber} from ${supplierName} is recorded in your purchase register but does not appear in GSTR-2B. Under Section 16(2)(aa) of the CGST Act, Input Tax Credit (ITC) of ₹${taxDiscrepancy.toFixed(2)} cannot be claimed in GSTR-3B until the supplier files GSTR-1.`;
        possibleCauses.push('Supplier has not filed GSTR-1 for the relevant tax period');
        possibleCauses.push('Supplier files GSTR-1 quarterly under the QRMP scheme');
        possibleCauses.push('Supplier filed under an incorrect recipient GSTIN');
        recommendedAction = 'Contact the supplier accounts team and verify GSTR-1 filing status for this invoice.';
        checklist.push('Verify supplier invoice copy and e-way bill / delivery proof');
        checklist.push('Check supplier filing history on the GST portal (search tax payer)');
        checklist.push('Request supplier to include invoice in their upcoming GSTR-1 or table 9A amendment');
        template = `Subject: Discrepancy in GSTR-2B - Invoice ${invoiceNumber} - ${supplierName}\n\nDear Accounts Team,\n\nOur records indicate invoice ${invoiceNumber} for ₹${totalDifference.toFixed(2)} is pending in our GSTR-2B. Kindly confirm if this has been filed in your GSTR-1 so we can avail the eligible ITC of ₹${taxDiscrepancy.toFixed(2)}.\n\nThank you,\nFinance Department`;
        break;

      case 'TAX_MISMATCH':
        explanation = `The total invoice amount matches, but there is a ₹${taxDiscrepancy.toFixed(2)} discrepancy in the tax components. This often occurs when intra-state supply (CGST+SGST) is booked instead of inter-state supply (IGST), or vice versa.`;
        possibleCauses.push('Discrepancy in Place of Supply (POS) recorded in books versus supplier GSTR-1');
        possibleCauses.push('Item-wise tax rate variance (e.g. 18% vs 12%)');
        possibleCauses.push('Tax component misallocation during voucher entry in ERP');
        recommendedAction = 'Inspect the Place of Supply on the original tax invoice and verify against your ERP ledger voucher.';
        checklist.push('Review supplier state code vs delivery location state code');
        checklist.push('Verify tax percentage breakdown per line item');
        checklist.push('Pass internal JV entry to adjust IGST vs CGST/SGST if entry was wrong in books');
        template = `Subject: Tax Classification Verification - Invoice ${invoiceNumber}\n\nDear Accounts Team,\n\nWe noticed a tax component difference on Invoice ${invoiceNumber}. Please verify whether this transaction was reported as inter-state (IGST) or intra-state (CGST+SGST) in your GSTR-1.\n\nRegards,\nFinance Team`;
        break;

      case 'AMOUNT_MISMATCH':
        explanation = `Invoice ${invoiceNumber} exists in both records, but there is a total difference of ₹${totalDifference.toFixed(2)} and a taxable difference of ₹${mismatchCase.taxableDifference.toFixed(2)}.`;
        possibleCauses.push('Trade discount or cash discount recorded in ERP but not in supplier GSTR-1');
        possibleCauses.push('Freight or packaging charges excluded in purchase voucher');
        possibleCauses.push('Typographical error during manual bill booking');
        recommendedAction = 'Compare line items on physical invoice against purchase register voucher.';
        checklist.push('Check invoice line items against purchase order and GRN');
        checklist.push('Verify debit/credit notes issued for discounts');
        template = `Subject: Invoice Amount Discrepancy - ${invoiceNumber}\n\nDear Accounts Team,\n\nThere is a variance of ₹${totalDifference.toFixed(2)} between our purchase ledger and your filed GSTR-2B data for Invoice ${invoiceNumber}. Please share the detailed line-item bill copy for verification.\n\nRegards,\nFinance Team`;
        break;

      case 'MISSING_IN_PURCHASE_REGISTER':
        explanation = `Invoice ${invoiceNumber} appears in your GSTR-2B from ${supplierName}, but has not been recorded in your company books. You have ₹${taxDiscrepancy.toFixed(2)} of potential unclaimed ITC.`;
        possibleCauses.push('Bill received by warehouse/operations team but not yet handed over to accounts');
        possibleCauses.push('Goods in transit (GRN pending entry)');
        possibleCauses.push('Supplier accidentally reported an invoice under your GSTIN');
        recommendedAction = 'Confirm with procurement if goods/services were received, and book the purchase bill.';
        checklist.push('Check procurement orders for supplier ' + supplierName);
        checklist.push('Search gate pass or goods receipt notes (GRN)');
        template = `Subject: Clarification on Billed Invoice ${invoiceNumber}\n\nDear Accounts Team,\n\nWe see invoice ${invoiceNumber} for ₹${totalDifference.toFixed(2)} reported under our GSTIN in GSTR-2B. Kindly share the invoice copy and PO reference.\n\nRegards,\nFinance Team`;
        break;

      case 'DUPLICATE_CANDIDATE':
        explanation = `Multiple entries found for invoice ${invoiceNumber} from ${supplierName}. Potential duplicate payment or double claiming of ₹${taxDiscrepancy.toFixed(2)} ITC.`;
        possibleCauses.push('Invoice entered twice in ERP with different dates or voucher numbers');
        possibleCauses.push('Supplier uploaded duplicate amendment or revision in GSTR-1');
        recommendedAction = 'Cancel or reverse the duplicate entry in your accounting ledger immediately.';
        checklist.push('Check voucher payment history for duplicate payout');
        checklist.push('Verify supplier ledger statement');
        template = `Subject: Duplicate Invoice Query - ${invoiceNumber}\n\nDear Accounts Team,\n\nWe noticed invoice ${invoiceNumber} appears more than once in our reconciliation. Please verify if multiple bills were issued or if a credit note applies.\n\nRegards,\nFinance Team`;
        break;

      default:
        explanation = `Reconciliation detected a ${matchType} for invoice ${invoiceNumber} with ₹${taxDiscrepancy.toFixed(2)} variance.`;
        possibleCauses.push('Date reporting shift between invoice date and filing month');
        possibleCauses.push('Rounding difference in paise calculation');
        recommendedAction = 'Accept the verified match if the amounts are within business tolerance.';
        checklist.push('Confirm supplier GSTIN: ' + supplierGstin);
        checklist.push('Verify invoice date within allowable period');
        template = '';
    }

    return {
      explanation,
      possibleCauses,
      recommendedAction,
      verificationChecklist: checklist,
      supplierFollowUpTemplate: template,
      riskLevel: priority,
      confidence: 0.9,
      disclaimer: 'Deterministic compliance recommendation. Verify against original invoices before filing GSTR-3B.',
    };
  }

  /**
   * General GST Assistant answer
   */
  static async askQuestion(question: string, context?: any): Promise<{ answer: string; references: string[] }> {
    const gemini = CopilotService.getGeminiClient();

    if (!gemini) {
      // Deterministic answers for common questions
      if (question.toLowerCase().includes('difference between purchase register and gstr-2b') || question.toLowerCase().includes('gstr-2b')) {
        return {
          answer: `**Purchase Register vs GSTR-2B:**
1. **Purchase Register (Books of Accounts)**: Maintained internally by your business (via Tally/SAP/Zoho). It reflects all purchase bills received, entered, and accounted for by your finance team.
2. **GSTR-2B**: An auto-drafted, static input tax credit (ITC) statement generated by the GST portal on the 14th of every month. It reflects invoices uploaded by your suppliers in their GSTR-1/IFF.
3. **Reconciliation Significance**: Under GST Section 16(2)(aa) & Rule 36(4), you can only claim ITC if the supplier has filed their GSTR-1 and the invoice appears in your GSTR-2B. Reconciling prevents interest penalties (Section 50) and ensures no unclaimed ITC is lost.`,
          references: ['CGST Act Section 16(2)(aa)', 'CGST Rules Rule 36(4)', 'CBIC Circular No. 170/02/2022-GST'],
        };
      }

      return {
        answer: `I am your Autonomous GST Reconciliation Copilot. To get real-time dynamic AI explanations, ensure your GEMINI_API_KEY is configured in your environment. For now, all invoice matching, tax-at-risk analysis, and variance classifications are calculated deterministically with 100% precision!`,
        references: ['Autonomous GST Reconciliation Engine', 'Indian GST Compliance Standards'],
      };
    }

    try {
      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `You are an Indian GST and Fintech tax advisor assistant. Answer the user's question clearly and accurately according to current CBIC GST rules, Section 16, Rule 36(4), and reconciliation practices.
User question: "${question}"
Additional context provided: ${JSON.stringify(context || {})}`;

      const res = await model.generateContent(prompt);
      return {
        answer: res.response.text(),
        references: ['CBIC Guidelines', 'CGST Act 2017', 'GSTR-2B Advisory'],
      };
    } catch (err: any) {
      return {
        answer: `Unable to connect to Gemini AI service at this moment (${err.message}). Using built-in GST rules knowledge base.`,
        references: ['Autonomous GST Fallback Engine'],
      };
    }
  }
}
