const AUTH_MESSAGE_VERSION = 1;
const KEY_DERIVATION_VERSION = 1;
const BESEEN_AUTH_DOMAIN = 'beseen.app';

const AUTH_CHALLENGE_PURPOSES = ['registration', 'login'] as const;
const STELLAR_NETWORKS = ['public', 'testnet'] as const;
const USER_KEY_STATUSES = ['active', 'revoked'] as const;

const AUTH_NONCE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BASE64_PUBLIC_KEY_PATTERN = /^[A-Za-z0-9+/]{43}=$/;
const PUBLIC_KEY_LENGTH_BYTES = 32;

type AuthChallengePurpose = (typeof AUTH_CHALLENGE_PURPOSES)[number];
type StellarNetwork = (typeof STELLAR_NETWORKS)[number];
type UserKeyStatus = (typeof USER_KEY_STATUSES)[number];

export {
  AUTH_CHALLENGE_PURPOSES,
  AUTH_MESSAGE_VERSION,
  AUTH_NONCE_PATTERN,
  BASE64_PUBLIC_KEY_PATTERN,
  BESEEN_AUTH_DOMAIN,
  KEY_DERIVATION_VERSION,
  PUBLIC_KEY_LENGTH_BYTES,
  STELLAR_NETWORKS,
  USER_KEY_STATUSES,
};
export type { AuthChallengePurpose, StellarNetwork, UserKeyStatus };
