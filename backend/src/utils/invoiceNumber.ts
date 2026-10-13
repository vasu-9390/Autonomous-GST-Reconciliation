export class InvoiceNumberUtil {
  /**
   * Normalize an invoice number for fuzzy/robust matching:
   * 1. Trim and uppercase
   * 2. Split by common delimiters (/, -, _, ., spaces)
   * 3. Strip redundant leading zeroes from each numeric token (e.g. '0042' -> '42')
   * 4. Join remaining alphanumeric characters
   */
  static normalize(rawInvoiceNo: string | null | undefined): string {
    if (!rawInvoiceNo || typeof rawInvoiceNo !== 'string') return '';

    const parts = rawInvoiceNo
      .trim()
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter((p) => p.length > 0);

    return parts
      .map((part) => part.replace(/^0+([1-9])/, '$1'))
      .join('');
  }

  /**
   * Calculate Levenshtein distance for fuzzy invoice number matching (Stage 4)
   */
  static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
