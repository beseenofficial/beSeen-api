import readContract from './readContract';
import { isContractErrorCode } from './readContract';
import decodeContractBounty from './contractBountyCodec';
import type { ContractBountyData } from '../../types/contract/bounty';

const BOUNTY_NOT_FOUND_ERROR_CODE = 16;

const getContractBounty = async (contractBountyId: bigint): Promise<ContractBountyData | null> => {
  if (contractBountyId < 1n || contractBountyId > (1n << 64n) - 1n) {
    throw new RangeError('Contract bounty ID must be within the positive u64 range');
  }

  let result: unknown;

  try {
    result = await readContract('get_bounty', [{ type: 'u64', value: contractBountyId }]);
  } catch (error: unknown) {
    if (isContractErrorCode(error, BOUNTY_NOT_FOUND_ERROR_CODE)) {
      return null;
    }

    throw error;
  }

  const decoded = decodeContractBounty(result);

  if (decoded.contractBountyId !== contractBountyId.toString()) {
    throw new Error('get_bounty returned a different bounty ID');
  }

  return decoded;
};

export default getContractBounty;
