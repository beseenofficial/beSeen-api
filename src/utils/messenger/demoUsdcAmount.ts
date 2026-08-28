import { DEMO_USDC_DECIMAL_PLACES } from '../../constant/messenger';

const SCALE = 10n ** BigInt(DEMO_USDC_DECIMAL_PLACES);

const parseDemoUsdcUnits = (amount: string): number => {
  const [whole = '0', fraction = ''] = amount.split('.');
  const units = BigInt(whole) * SCALE + BigInt(fraction.padEnd(DEMO_USDC_DECIMAL_PLACES, '0'));

  if (units <= 0n || units > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Demo USDC amount is outside the supported range');
  }

  return Number(units);
};

const formatDemoUsdcUnits = (units: number): string => {
  if (!Number.isSafeInteger(units) || units < 0) {
    throw new RangeError('Demo USDC balance units must be a non-negative safe integer');
  }

  const value = BigInt(units);
  const whole = value / SCALE;
  const fraction = (value % SCALE).toString().padStart(DEMO_USDC_DECIMAL_PLACES, '0');
  const trimmedFraction = fraction.replace(/0+$/u, '');

  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole.toString();
};

export { formatDemoUsdcUnits, parseDemoUsdcUnits };
