import {
  AUTH_MESSAGE_VERSION,
  AUTH_NONCE_PATTERN,
  KEY_DERIVATION_VERSION,
  STELLAR_NETWORKS,
} from '../../constant/auth';
import type { StellarNetwork } from '../../constant/auth';
import isValidStellarGAddress from '../stellar/isValidStellarGAddress';
import isBase64PublicKey from './isBase64PublicKey';

const AUTH_DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:localhost|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::\d{1,5})?$/;

interface BuildRegistrationMessageInput {
  domain: string;
  network: StellarNetwork;
  walletAddress: string;
  signingPublicKey: string;
  encryptionPublicKey: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
}

/**
 * Returns the exact human-readable payload that the wallet signs via SEP-53.
 * The wallet is responsible for applying the SEP-53 prefix and hash.
 */
const buildRegistrationMessage = ({
  domain,
  network,
  walletAddress,
  signingPublicKey,
  encryptionPublicKey,
  nonce,
  issuedAt,
  expiresAt,
}: BuildRegistrationMessageInput): string => {
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

  if (!isBase64PublicKey(signingPublicKey)) {
    throw new Error('Invalid Ed25519 signing public key');
  }

  if (!isBase64PublicKey(encryptionPublicKey)) {
    throw new Error('Invalid X25519 encryption public key');
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
    'BeSeen Registration',
    `Version: ${AUTH_MESSAGE_VERSION}`,
    `Domain: ${normalizedDomain}`,
    `Network: ${network.toUpperCase()}`,
    `Account: ${normalizedAddress}`,
    `Key Derivation Version: ${KEY_DERIVATION_VERSION}`,
    `Signing Public Key (Ed25519): ${signingPublicKey}`,
    `Encryption Public Key (X25519): ${encryptionPublicKey}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
  ].join('\n');
};

export default buildRegistrationMessage;
export { AUTH_DOMAIN_PATTERN };
export type { BuildRegistrationMessageInput };
