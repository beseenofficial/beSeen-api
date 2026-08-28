import { describe, expect, it } from 'vitest';

import { formatDemoUsdcUnits, parseDemoUsdcUnits } from '../../src/utils/messenger/demoUsdcAmount';

describe('demo USDC amount conversion', () => {
  it('converts canonical decimal strings to exact seven-decimal integer units', () => {
    expect(parseDemoUsdcUnits('20')).toBe(200_000_000);
    expect(parseDemoUsdcUnits('10.5')).toBe(105_000_000);
    expect(parseDemoUsdcUnits('0.0000001')).toBe(1);
  });

  it('formats exact units without floating-point artifacts', () => {
    expect(formatDemoUsdcUnits(200_000_000)).toBe('20');
    expect(formatDemoUsdcUnits(105_000_000)).toBe('10.5');
    expect(formatDemoUsdcUnits(1)).toBe('0.0000001');
  });

  it('rejects zero, unsafe amounts, and invalid balance units', () => {
    expect(() => parseDemoUsdcUnits('0')).toThrow(RangeError);
    expect(() => parseDemoUsdcUnits('999999999999')).toThrow(RangeError);
    expect(() => formatDemoUsdcUnits(-1)).toThrow(RangeError);
  });
});
