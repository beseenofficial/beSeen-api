import { AUTH_MESSAGE_VERSION, AUTH_NONCE_PATTERN, STELLAR_NETWORKS } from '../../constant/auth';
import type { StellarNetwork } from '../../constant/auth';
import isValidStellarGAddress from '../stellar/isValidStellarGAddress';
import { AUTH_DOMAIN_PATTERN } from './buildRegistrationMessage';

interface BuildLoginMessageInput {
  domain: string;
  network: StellarNetwork;
  walletAddress: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}

const buildLoginMessage = ({
  domain,
  network,
  walletAddress,
  nonce,
  issuedAt,
  expiresAt,
}: BuildLoginMessageInput): string => {
  const normalizedDomain = domain.trim().toLowerCase();
  const normalizedAddress = walletAddress.trim().toUpperCase();

  if (!AUTH_DOMAIN_PATTERN.test(normalizedDomain)) {
    throw new Error('Invalid authentication domain');
  }

  if (!STELLAR_NETWORKS.includes(network)) {
    throw new Error('Unsupported Stellar network');
  }

  if (!isValidStellarGAddress(normalizedAddress)) {
    throw new Error('Invalid Stellar G address');
  }

  if (!AUTH_NONCE_PATTERN.test(nonce)) {
    throw new Error('Invalid authentication nonce');
  }

  if (Number.isNaN(issuedAt.getTime()) || Number.isNaN(expiresAt.getTime())) {
    throw new Error('Invalid challenge date');
  }

  if (expiresAt <= issuedAt) {
    throw new Error('Challenge expiration must be after its issue time');
  }

  return [
    'BeSeen Login',
    `Version: ${AUTH_MESSAGE_VERSION}`,
    `Domain: ${normalizedDomain}`,
    `Network: ${network.toUpperCase()}`,
    `Account: ${normalizedAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
  ].join('\n');
};

export default buildLoginMessage;
export type { BuildLoginMessageInput };
