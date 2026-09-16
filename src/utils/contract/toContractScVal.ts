import stellarSdk from './stellarSdk';
import type { ContractParameter } from '../../types/contract/invocation';

const toContractScVal = (parameter: ContractParameter) => {
  if (parameter.type === 'address') {
    return stellarSdk.Address.fromString(parameter.value).toScVal();
  }

  if (parameter.type === 'u64') {
    return stellarSdk.nativeToScVal(parameter.value, { type: 'u64' });
  }

  return stellarSdk.nativeToScVal(parameter.value, { type: 'u64' });
};

export default toContractScVal;
