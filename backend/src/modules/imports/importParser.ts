import * as XLSX from 'xlsx';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { DecimalUtil } from '../../utils/decimal';
import { GSTINUtil } from '../../utils/gstin';
import { InvoiceNumberUtil } from '../../utils/invoiceNumber';
import { DateUtil } from '../../utils/date';
import { IImportRowError } from '../../models/ImportJob';

export interface CanonicalInvoiceRow {
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  normalizedInvoiceNumber: string;
  invoiceDate: Date;
  documentType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalAmount: number;
  placeOfSupply?: string;
  reverseCharge: boolean;
  itcEligibility: 'ELIGIBLE' | 'INELIGIBLE';
  filingPeriod?: string;
  rawMetadata: Record<string, any>;
}

// Canonical fields that should be mapped from file headers
export const CANONICAL_FIELD_MAP: Record<string, string[]> = {
  supplierGstin: ['supplier gstin', 'supplier_gstin', 'gstin of supplier', 'ctin', 'gstin', 'vendor gstin'],
  supplierName: ['supplier name', 'supplier_name', 'trade name', 'legal name', 'vendor name', 'party name', 'name'],
  invoiceNumber: ['invoice number', 'invoice_number', 'invoice no', 'inv no', 'invoice num', 'bill no', 'doc no'],
  invoiceDate: ['invoice date', 'invoice_date', 'inv date', 'bill date', 'date', 'doc date'],
  documentType: ['document type', 'doc type', 'type', 'invoice type'],
  taxableValue: ['taxable value', 'taxable_value', 'taxable amount', 'taxable', 'assessable value', 'base amount'],
  cgst: ['cgst', 'central tax', 'cgst amount', 'cgst_amount'],
  sgst: ['sgst', 'state tax', 'sgst amount', 'sgst_amount', 'utgst'],
  igst: ['igst', 'integrated tax', 'igst amount', 'igst_amount'],
  cess: ['cess', 'cess amount', 'cess_amount'],
  totalAmount: ['total amount', 'total_amount', 'invoice value', 'total', 'grand total', 'invoice amount'],
  placeOfSupply: ['place of supply', 'place_of_supply', 'pos', 'state'],
  itcEligibility: ['itc eligibility', 'itc_eligibility', 'itc available', 'eligibility'],
  filingPeriod: ['filing period', 'filing_period', 'return period', 'period'],
};

export class ImportParser {
  /**
   * Parse raw buffer (CSV or Excel) into array of object rows
   */
  static async parseBufferToRows(buffer: Buffer, originalName: string): Promise<Record<string, any>[]> {
    const isExcel = originalName.endsWith('.xlsx') || originalName.endsWith('.xls');

    if (isExcel) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
      return rows;
    }

    // Default: CSV Parsing
    return new Promise((resolve, reject) => {
      const results: Record<string, any>[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err));
    });
  }

  /**
   * Automatically infer column mappings from headers
   */
  static autoDetectColumnMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    for (const [canonicalKey, aliases] of Object.entries(CANONICAL_FIELD_MAP)) {
      for (const header of headers) {
        const cleanHeader = header.toLowerCase().replace(/[_-]/g, ' ').trim();
        if (aliases.includes(cleanHeader) || aliases.some((a) => cleanHeader.includes(a))) {
          mapping[canonicalKey] = header;
          break;
        }
      }
    }

    return mapping;
  }

  /**
   * Validate and transform raw rows into canonical invoice objects
   */
  static processRows(
    rows: Record<string, any>[],
    columnMapping: Record<string, string>
  ): {
    validInvoices: CanonicalInvoiceRow[];
    errors: IImportRowError[];
    duplicateCount: number;
  } {
    const validInvoices: CanonicalInvoiceRow[] = [];
    const errors: IImportRowError[] = [];
    const seenInvoiceKeys = new Set<string>();
    let duplicateCount = 0;

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // Accounting for 1-based index and header line

      const rawGstin = row[columnMapping.supplierGstin || 'Supplier GSTIN'] || row['supplierGstin'] || '';
      const rawSupplierName = row[columnMapping.supplierName || 'Supplier Name'] || row['supplierName'] || 'Unknown Supplier';
      const rawInvoiceNo = row[columnMapping.invoiceNumber || 'Invoice Number'] || row['invoiceNumber'] || '';
      const rawInvoiceDate = row[columnMapping.invoiceDate || 'Invoice Date'] || row['invoiceDate'] || '';
      const rawDocType = (row[columnMapping.documentType || 'Document Type'] || 'INVOICE').toString().toUpperCase();

      const rawTaxable = row[columnMapping.taxableValue || 'Taxable Value'];
      const rawCgst = row[columnMapping.cgst || 'CGST'];
      const rawSgst = row[columnMapping.sgst || 'SGST'];
      const rawIgst = row[columnMapping.igst || 'IGST'];
      const rawCess = row[columnMapping.cess || 'Cess'];
      const rawTotal = row[columnMapping.totalAmount || 'Total Amount'];
      const rawPos = row[columnMapping.placeOfSupply || 'Place of Supply'] || '';
      const rawPeriod = row[columnMapping.filingPeriod || 'Filing Period'] || '';

      // Validation 1: Required Invoice Number
      if (!rawInvoiceNo || !rawInvoiceNo.toString().trim()) {
        errors.push({
          rowNumber,
          errorMessage: 'Invoice Number is missing or empty',
          rawData: row,
        });
        return;
      }

      // Validation 2: GSTIN Structure
      const gstinValidation = GSTINUtil.validate(rawGstin);
      if (!gstinValidation.isValid) {
        errors.push({
          rowNumber,
          rawInvoiceNumber: rawInvoiceNo.toString(),
          supplierGstin: rawGstin,
          errorMessage: gstinValidation.error || 'Invalid GSTIN',
          rawData: row,
        });
        return;
      }

      // Validation 3: Date Parsing
      const parsedDate = DateUtil.parse(rawInvoiceDate);
      if (!parsedDate) {
        errors.push({
          rowNumber,
          rawInvoiceNumber: rawInvoiceNo.toString(),
          supplierGstin: gstinValidation.normalizedGstin,
          errorMessage: `Invalid invoice date format: "${rawInvoiceDate}". Must be YYYY-MM-DD or DD/MM/YYYY`,
          rawData: row,
        });
        return;
      }

      // Monetary Calculations (Decimal-safe)
      const taxableValue = DecimalUtil.parse(rawTaxable);
      const cgst = DecimalUtil.parse(rawCgst);
      const sgst = DecimalUtil.parse(rawSgst);
      const igst = DecimalUtil.parse(rawIgst);
      const cess = DecimalUtil.parse(rawCess);

      let totalAmount = DecimalUtil.parse(rawTotal);
      if (totalAmount === 0 && taxableValue > 0) {
        // Derive total if total was omitted in dataset
        totalAmount = DecimalUtil.add(taxableValue, DecimalUtil.add(DecimalUtil.add(cgst, sgst), DecimalUtil.add(igst, cess)));
      }

      const normalizedInvoiceNo = InvoiceNumberUtil.normalize(rawInvoiceNo.toString());

      // Validation 4: In-file duplicate detection
      const uniqueKey = `${gstinValidation.normalizedGstin}_${normalizedInvoiceNo}_${DateUtil.toISODate(parsedDate)}`;
      if (seenInvoiceKeys.has(uniqueKey)) {
        duplicateCount++;
        errors.push({
          rowNumber,
          rawInvoiceNumber: rawInvoiceNo.toString(),
          supplierGstin: gstinValidation.normalizedGstin,
          errorMessage: `Duplicate invoice entry in file for Supplier ${gstinValidation.normalizedGstin} and Invoice ${rawInvoiceNo}`,
          rawData: row,
        });
        return;
      }
      seenInvoiceKeys.add(uniqueKey);

      // Determine Document Type
      let docType: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' = 'INVOICE';
      if (rawDocType.includes('CREDIT') || rawDocType.includes('CR') || rawDocType === 'CN') {
        docType = 'CREDIT_NOTE';
      } else if (rawDocType.includes('DEBIT') || rawDocType.includes('DR') || rawDocType === 'DN') {
        docType = 'DEBIT_NOTE';
      }

      validInvoices.push({
        supplierGstin: gstinValidation.normalizedGstin,
        supplierName: rawSupplierName.toString().trim(),
        invoiceNumber: rawInvoiceNo.toString().trim(),
        normalizedInvoiceNumber: normalizedInvoiceNo,
        invoiceDate: parsedDate,
        documentType: docType,
        taxableValue,
        cgst,
        sgst,
        igst,
        cess,
        totalAmount,
        placeOfSupply: rawPos.toString().trim(),
        reverseCharge: false,
        itcEligibility: 'ELIGIBLE',
        filingPeriod: rawPeriod.toString().trim(),
        rawMetadata: row,
      });
    });

    return { validInvoices, errors, duplicateCount };
  }
}
