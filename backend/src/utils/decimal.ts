import BigNumber from 'bignumber.js';

// Configure BigNumber for strict financial rounding (ROUND_HALF_UP)
BigNumber.config({ DECIMAL_PLACES: 2, ROUNDING_MODE: BigNumber.ROUND_HALF_UP });

export class DecimalUtil {
  /**
   * Safely parse an input number or string to a standardized 2-decimal number
   */
  static parse(val: number | string | null | undefined): number {
    if (val === null || val === undefined || val === '') return 0;
    try {
      const bn = new BigNumber(val.toString().replace(/,/g, '').trim());
      return bn.isFinite() ? bn.decimalPlaces(2).toNumber() : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Safe addition
   */
  static add(a: number | string, b: number | string): number {
    return new BigNumber(a).plus(new BigNumber(b)).decimalPlaces(2).toNumber();
  }

  /**
   * Safe subtraction
   */
  static subtract(a: number | string, b: number | string): number {
    return new BigNumber(a).minus(new BigNumber(b)).decimalPlaces(2).toNumber();
  }

  /**
   * Absolute difference
   */
  static diff(a: number | string, b: number | string): number {
    return new BigNumber(a).minus(new BigNumber(b)).abs().decimalPlaces(2).toNumber();
  }

  /**
   * Check if difference is within a specified absolute tolerance (e.g. ₹1.00 or ₹0.01)
   */
  static isWithinTolerance(a: number | string, b: number | string, tolerance = 1.0): boolean {
    const d = DecimalUtil.diff(a, b);
    return new BigNumber(d).isLessThanOrEqualTo(new BigNumber(tolerance));
  }

  /**
   * Strict equality check down to 2 decimal places
   */
  static equals(a: number | string, b: number | string): boolean {
    return new BigNumber(a).isEqualTo(new BigNumber(b));
  }

  /**
   * Convert to integer paise to eliminate all fractional floating point issues
   */
  static toPaise(rupees: number | string): number {
    return new BigNumber(rupees).multipliedBy(100).integerValue().toNumber();
  }

  /**
   * Convert from paise back to rupees
   */
  static fromPaise(paise: number): number {
    return new BigNumber(paise).dividedBy(100).decimalPlaces(2).toNumber();
  }
}
