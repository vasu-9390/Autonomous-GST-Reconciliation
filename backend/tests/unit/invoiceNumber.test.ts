import { InvoiceNumberUtil } from '../../src/utils/invoiceNumber';

describe('InvoiceNumberUtil - Normalization & Fuzzy Matching', () => {
  test('strips punctuation, slashes, hyphens, and whitespace', () => {
    expect(InvoiceNumberUtil.normalize('INV/2024-25/0042')).toBe('INV20242542');
    expect(InvoiceNumberUtil.normalize('DEL-104')).toBe('DEL104');
    expect(InvoiceNumberUtil.normalize('  ics / blr / 8821 ')).toBe('ICSBLR8821');
  });

  test('calculates Levenshtein distance accurately for fuzzy matching', () => {
    expect(InvoiceNumberUtil.levenshteinDistance('INV101', 'INV101')).toBe(0);
    expect(InvoiceNumberUtil.levenshteinDistance('INV101', 'INV102')).toBe(1);
    expect(InvoiceNumberUtil.levenshteinDistance('INV101', 'INV1001')).toBe(1);
    expect(InvoiceNumberUtil.levenshteinDistance('INV101', 'DEL999')).toBe(6);
  });
});
