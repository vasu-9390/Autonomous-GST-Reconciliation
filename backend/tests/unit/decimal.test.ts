import { DecimalUtil } from '../../src/utils/decimal';

describe('DecimalUtil - Safe Financial Calculations', () => {
  test('accurately adds floating point decimals without JS IEEE 754 precision errors', () => {
    // In plain JS: 0.1 + 0.2 === 0.30000000000000004
    const result = DecimalUtil.add(0.1, 0.2);
    expect(result).toBe(0.3);
  });

  test('accurately computes differences and paise conversions', () => {
    const diff = DecimalUtil.diff('118000.45', '118000.00');
    expect(diff).toBe(0.45);

    const paise = DecimalUtil.toPaise(1250.75);
    expect(paise).toBe(125075);
    expect(DecimalUtil.fromPaise(paise)).toBe(1250.75);
  });

  test('correctly evaluates tolerance boundaries', () => {
    expect(DecimalUtil.isWithinTolerance(100.5, 101.2, 1.0)).toBe(true);
    expect(DecimalUtil.isWithinTolerance(100.0, 102.5, 1.0)).toBe(false);
  });
});
