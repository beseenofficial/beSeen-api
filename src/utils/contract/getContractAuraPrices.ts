import log from '../../logger';
import getContractAuraPrice from './getContractAuraPrice';

const getContractAuraPrices = async (
  walletAddresses: string[],
): Promise<Map<string, string | null>> => {
  const uniqueWalletAddresses = [...new Set(walletAddresses)];

  const entries = await Promise.all(
    uniqueWalletAddresses.map(async (walletAddress) => {
      try {
        const auraPrice = await getContractAuraPrice(walletAddress);

        return [walletAddress, auraPrice] as const;
      } catch (error: unknown) {
        log.warn({ err: error, walletAddress }, 'Unable to read current Aura price');

        return [walletAddress, null] as const;
      }
    }),
  );

  return new Map(entries);
};

export default getContractAuraPrices;
