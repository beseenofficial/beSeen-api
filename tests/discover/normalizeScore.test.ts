import { describe, expect, it } from 'vitest';

import {
  calculateRecency,
  normalizeLogarithmically,
} from '../../src/utils/discover/normalizeScore';

describe('Discover score normalization', () => {
  it('normalizes logarithmic values between zero and one', () => {
    expect(normalizeLogarithmically(0, 100)).toBe(0);
    expect(normalizeLogarithmically(100, 100)).toBe(1);
    expect(normalizeLogarithmically(1_000, 100)).toBe(1);
  });

  it('returns zero for missing activity and clamps future activity', () => {
    const now = new Date('2026-08-11T12:00:00.000Z');

    expect(calculateRecency(null, now, 7)).toBe(0);
    expect(calculateRecency(new Date('2026-08-12T12:00:00.000Z'), now, 7)).toBe(1);
  });
});
