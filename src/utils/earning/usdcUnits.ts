import { USDC_DECIMAL_PLACES } from '../../constant/messenger';

const formatUsdcUnits = (value: string | bigint): string => {
  const units = typeof value === 'bigint' ? value : BigInt(value);
  const scale = 10n ** BigInt(USDC_DECIMAL_PLACES);
  const whole = units / scale;
  const fraction = (units % scale).toString().padStart(USDC_DECIMAL_PLACES, '0').replace(/0+$/, '');

  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
};

export default formatUsdcUnits;
