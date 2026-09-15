import type { AuraPriceParams } from '../../types/contract/aura';

const U32_MAX = (1n << 32n) - 1n;

const I128_MIN = -(1n << 127n);

const I128_MAX = (1n << 127n) - 1n;

const requireI128 = (value: bigint): void => {
  if (value < I128_MIN || value > I128_MAX) {
    throw new RangeError('Aura price calculation overflowed i128');
  }
};

const requireAuraPriceParams = (basePrice: bigint, increment: bigint): AuraPriceParams => {
  requireI128(basePrice);
  requireI128(increment);

  if (basePrice <= 0n || increment < 0n) {
    throw new RangeError('Aura base price must be positive and increment must be non-negative');
  }

  return { basePrice, increment };
};

const auraPriceAt = (params: AuraPriceParams, sold: number | bigint): bigint => {
  const soldValue = BigInt(sold);

  if (soldValue < 0n || soldValue > U32_MAX) {
    throw new RangeError('Aura sold count must be within the u32 range');
  }

  const step = soldValue * params.increment;
  requireI128(step);

  const price = params.basePrice + step;
  requireI128(price);

  return price;
};

export { auraPriceAt, requireAuraPriceParams };
