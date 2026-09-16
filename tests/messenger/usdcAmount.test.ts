import { describe, expect, it } from 'vitest';

import parseUsdcUnits from '../../src/utils/messenger/usdcAmount';

describe('USDC amount conversion', () => {
  it('converts canonical decimal strings to exact bigint base units', () => {
    expect(parseUsdcUnits('20')).toBe(200_000_000n);
    expect(parseUsdcUnits('10.5')).toBe(105_000_000n);
    expect(parseUsdcUnits('0.0000001')).toBe(1n);
    expect(parseUsdcUnits('999999999999')).toBe(9_999_999_999_990_000_000n);
  });

  it('rejects non-positive and non-canonical amounts', () => {
    expect(() => parseUsdcUnits('0')).toThrow(RangeError);
    expect(() => parseUsdcUnits('1.00000001')).toThrow(RangeError);
  });
});
