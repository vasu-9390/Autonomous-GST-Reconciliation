import { GSTINUtil } from '../../src/utils/gstin';

describe('GSTINUtil - Indian GST Identification Number Validation', () => {
  test('validates correct 15-character GSTIN structure', () => {
    const validGstin = '27AABCU9603R1ZM';
    const result = GSTINUtil.validate(validGstin);

    expect(result.isValid).toBe(true);
    expect(result.normalizedGstin).toBe(validGstin);
    expect(result.stateCode).toBe('27');
    expect(result.pan).toBe('AABCU9603R');
  });

  test('rejects invalid length and incorrect structure', () => {
    expect(GSTINUtil.validate('INVALID').isValid).toBe(false);
    expect(GSTINUtil.validate('27AABCU9603R1Z').isValid).toBe(false); // only 14 chars
    expect(GSTINUtil.validate(null).isValid).toBe(false);
  });
});
