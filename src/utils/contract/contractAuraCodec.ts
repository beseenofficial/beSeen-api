import type { ContractAuraData, ObservedAuraPurchase } from '../../types/contract/aura';

const U64_MAX = (1n << 64n) - 1n;
const I128_MAX = (1n << 127n) - 1n;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asBigInt = (value: unknown, field: string): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value)) {
    return BigInt(value);
  }
  throw new TypeError(`Contract aura ${field} is not an integer`);
};

const asAddress = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !/^[CG][A-Z2-7]{55}$/.test(value)) {
    throw new TypeError(`Contract aura ${field} is not a Stellar address`);
  }
  return value;
};

const tokenId = (value: unknown): string => {
  const id = asBigInt(value, 'token_id');
  if (id < 1n || id > U64_MAX) {
    throw new RangeError('Aura token ID is outside the u64 range');
  }
  return id.toString();
};

const positiveI128 = (value: unknown, field: string): string => {
  const decoded = asBigInt(value, field);
  if (decoded < 0n || decoded > I128_MAX) {
    throw new RangeError(`Contract aura ${field} is outside the non-negative i128 range`);
  }
  return decoded.toString();
};

const decodeContractAura = (value: unknown): ContractAuraData => {
  if (!isRecord(value)) {
    throw new TypeError('Contract aura value must be a record');
  }
  return {
    contractTokenId: tokenId(value.token_id),
    owner: asAddress(value.owner, 'owner'),
    subject: asAddress(value.subject, 'subject'),
  };
};

const decodeAuraPurchasedEvent = (value: unknown): ObservedAuraPurchase => {
  if (!isRecord(value)) {
    throw new TypeError('Aura purchase event value must be a record');
  }
  const buyer = asAddress(value.buyer, 'buyer');
  return {
    contractTokenId: tokenId(value.token_id),
    owner: buyer,
    buyer,
    subject: asAddress(value.subject, 'subject'),
    price: positiveI128(value.price, 'price'),
    fee: positiveI128(value.fee, 'fee'),
  };
};

export { decodeAuraPurchasedEvent, decodeContractAura };
