import { USDC_DECIMAL_PLACES } from '../../constant/messenger';

const formatUsdcUnits = (value: string | bigint): string => {
  const units = typeof value === 'bigint' ? value : BigInt(value);
  const sign = units < 0n ? '-' : '';
  const absoluteUnits = units < 0n ? -units : units;
  const scale = 10n ** BigInt(USDC_DECIMAL_PLACES);
  const whole = absoluteUnits / scale;
  const fraction = (absoluteUnits % scale)
    .toString()
    .padStart(USDC_DECIMAL_PLACES, '0')
    .replace(/0+$/, '');

  return `${sign}${fraction ? `${whole.toString()}.${fraction}` : whole.toString()}`;
};

export default formatUsdcUnits;
