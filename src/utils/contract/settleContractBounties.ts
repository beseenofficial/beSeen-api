import submitContractTransaction from './submitContractTransaction';
import type { ContractTransactionResult } from '../../types/contract/invocation';

const settleContractBounties = async (
  contractBountyIds: bigint[],
): Promise<ContractTransactionResult> => {
  if (contractBountyIds.length === 0 || contractBountyIds.length > 25) {
    throw new RangeError('settle_replies requires between 1 and 25 bounty IDs');
  }

  if (contractBountyIds.some((id) => id < 1n || id > (1n << 64n) - 1n)) {
    throw new RangeError('Every contract bounty ID must be within the positive u64 range');
  }

  return submitContractTransaction('settle_replies', [
    { type: 'u64_array', value: contractBountyIds },
  ]);
};

export default settleContractBounties;
