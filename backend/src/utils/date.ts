export class DateUtil {
  /**
   * Parse various date formats commonly found in GST files:
   * - YYYY-MM-DD
   * - DD/MM/YYYY or DD-MM-YYYY
   * - MM/DD/YYYY
   * - Excel numeric serial dates (e.g. 45520)
   */
  static parse(dateInput: string | number | Date | null | undefined): Date | null {
    if (!dateInput) return null;

    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      return dateInput;
    }

    if (typeof dateInput === 'number') {
      // Excel serial date to JS Date (epoch Jan 1 1900 with leap year bug adjustment)
      const utcDays = Math.floor(dateInput - 25569);
      const utcValue = utcDays * 86400;
      return new Date(utcValue * 1000);
    }

    const str = dateInput.toString().trim();

    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      if (!isNaN(d.getTime())) return d;
    }

    // Try standard Date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }

  /**
   * Format to standardized YYYY-MM-DD
   */
  static toISODate(date: Date | null): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate difference in calendar days
   */
  static daysDiff(d1: Date, d2: Date): number {
    const timeDiff = Math.abs(d1.getTime() - d2.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}
