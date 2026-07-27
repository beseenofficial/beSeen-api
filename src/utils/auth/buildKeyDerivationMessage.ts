import { BESEEN_AUTH_DOMAIN, KEY_DERIVATION_VERSION, STELLAR_NETWORKS } from '../../constant/auth';
import type { StellarNetwork } from '../../constant/auth';
import isValidStellarGAddress from '../stellar/isValidStellarGAddress';

interface BuildKeyDerivationMessageInput {
  walletAddress: string;
  network: StellarNetwork;
}

/**
 * This message is a versioned protocol value. Changing any character creates
 * different BeSeen keys for the same wallet.
 */
const buildKeyDerivationMessage = ({
  walletAddress,
  network,
}: BuildKeyDerivationMessageInput): string => {
  const normalizedAddress = walletAddress.trim().toUpperCase();

  if (!isValidStellarGAddress(normalizedAddress)) {
    throw new Error('Invalid Stellar G address');
  }

  if (!STELLAR_NETWORKS.includes(network)) {
    throw new Error('Unsupported Stellar network');
  }

  return [
    'BeSeen Key Derivation',
    `Version: ${KEY_DERIVATION_VERSION}`,
    `Domain: ${BESEEN_AUTH_DOMAIN}`,
    `Network: ${network.toUpperCase()}`,
    `Account: ${normalizedAddress}`,
    'Purpose: Derive BeSeen identity and private communication keys.',
  ].join('\n');
};

export default buildKeyDerivationMessage;
export type { BuildKeyDerivationMessageInput };
