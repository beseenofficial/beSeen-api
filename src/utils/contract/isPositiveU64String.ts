const U64_MAX = (1n << 64n) - 1n;

const isPositiveU64String = (value: string): boolean =>
  /^[1-9]\d*$/.test(value) && BigInt(value) <= U64_MAX;

export default isPositiveU64String;
