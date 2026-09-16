import readContract from './readContract';
import { decodeContractAuraPrice } from './contractAuraCodec';

const getContractAuraPrice = async (walletAddress: string): Promise<string> => {
  const result = await readContract('aura_price', [{ type: 'address', value: walletAddress }]);

  return decodeContractAuraPrice(result);
};

export default getContractAuraPrice;
