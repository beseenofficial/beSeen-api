import readContract from './readContract';
import { isContractErrorCode } from './readContract';
import { decodeContractAura } from './contractAuraCodec';
import type { ContractAuraData } from '../../types/contract/aura';

const AURA_NOT_FOUND_ERROR_CODE = 11;

const getContractAura = async (contractTokenId: bigint): Promise<ContractAuraData | null> => {
  if (contractTokenId < 1n || contractTokenId > (1n << 64n) - 1n) {
    throw new RangeError('Aura token ID must be within the positive u64 range');
  }

  let result: unknown;

  try {
    result = await readContract('get_aura', [{ type: 'u64', value: contractTokenId }]);
  } catch (error: unknown) {
    if (isContractErrorCode(error, AURA_NOT_FOUND_ERROR_CODE)) {
      return null;
    }

    throw error;
  }

  const decoded = decodeContractAura(result);

  if (decoded.contractTokenId !== contractTokenId.toString()) {
    throw new Error('get_aura returned a different token ID');
  }

  return decoded;
};

export default getContractAura;
