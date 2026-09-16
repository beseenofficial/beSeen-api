import { describe, expect, it } from 'vitest';

import { auraPriceAt, requireAuraPriceParams } from '../../src/utils/contract/auraPrice';

describe('Aura price calculation', () => {
  it('matches the contract linear price curve exactly', () => {
    const params = requireAuraPriceParams(10_000_000n, 5_000_000n);

    expect(auraPriceAt(params, 0)).toBe(10_000_000n);
    expect(auraPriceAt(params, 1)).toBe(15_000_000n);
    expect(auraPriceAt(params, 10)).toBe(60_000_000n);
  });

  it('supports a zero increment', () => {
    const params = requireAuraPriceParams(10_000_000n, 0n);

    expect(auraPriceAt(params, 4_294_967_295n)).toBe(10_000_000n);
  });

  it('rejects invalid parameters and i128 overflow', () => {
    expect(() => requireAuraPriceParams(0n, 1n)).toThrow();
    expect(() => requireAuraPriceParams(1n, -1n)).toThrow();
    expect(() => auraPriceAt({ basePrice: (1n << 127n) - 1n, increment: 1n }, 1)).toThrow(
      'overflowed i128',
    );
  });
});
