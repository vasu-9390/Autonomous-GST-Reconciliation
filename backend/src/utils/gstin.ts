export interface GSTINValidationResult {
  isValid: boolean;
  normalizedGstin: string;
  stateCode?: string;
  pan?: string;
  error?: string;
}

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export class GSTINUtil {
  /**
   * Validate and parse an Indian GSTIN
   */
  static validate(rawGstin: string | null | undefined): GSTINValidationResult {
    if (!rawGstin || typeof rawGstin !== 'string') {
      return { isValid: false, normalizedGstin: '', error: 'GSTIN is required and cannot be empty' };
    }

    const clean = rawGstin.trim().toUpperCase().replace(/\s+/g, '');

    if (clean.length !== 15) {
      return {
        isValid: false,
        normalizedGstin: clean,
        error: `GSTIN must be exactly 15 characters long. Received length: ${clean.length}`
      };
    }

    if (!GSTIN_REGEX.test(clean)) {
      return {
        isValid: false,
        normalizedGstin: clean,
        error: 'Invalid GSTIN structure. Expected format: 2 State digits + 10 PAN chars + 1 Entity + Z + 1 Check digit'
      };
    }

    return {
      isValid: true,
      normalizedGstin: clean,
      stateCode: clean.substring(0, 2),
      pan: clean.substring(2, 12)
    };
  }

  /**
   * Helper to normalize GSTIN string (strip spaces, uppercase)
   */
  static normalize(rawGstin: string): string {
    return (rawGstin || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
}
