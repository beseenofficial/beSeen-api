import { describe, expect, it } from 'vitest';
import formatUsdcUnits from '../../src/utils/earning/usdcUnits';

describe('formatUsdcUnits', () => {
  it('formats exact USDC base units without floating point math', () => {
    expect(formatUsdcUnits('50000000')).toBe('5');
    expect(formatUsdcUnits('47500001')).toBe('4.7500001');
    expect(formatUsdcUnits('0')).toBe('0');
  });
});
