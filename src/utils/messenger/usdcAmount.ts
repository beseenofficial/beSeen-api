import { MESSENGER_BOUNTY_AMOUNT_PATTERN, USDC_DECIMAL_PLACES } from '../../constant/messenger';

const SCALE = 10n ** BigInt(USDC_DECIMAL_PLACES);

const I128_MAX = (1n << 127n) - 1n;

const parseUsdcUnits = (amount: string): bigint => {
  if (!MESSENGER_BOUNTY_AMOUNT_PATTERN.test(amount)) {
    throw new RangeError('USDC amount must be a canonical decimal with at most 7 decimal places');
  }

  const [whole = '0', fraction = ''] = amount.split('.');

  const units = BigInt(whole) * SCALE + BigInt(fraction.padEnd(USDC_DECIMAL_PLACES, '0'));

  if (units <= 0n || units > I128_MAX) {
    throw new RangeError('USDC amount is outside the positive i128 range');
  }

  return units;
};

export default parseUsdcUnits;
