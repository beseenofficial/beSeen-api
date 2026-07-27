import {
  AUTH_MESSAGE_VERSION,
  BESEEN_AUTH_DOMAIN,
  KEY_DERIVATION_VERSION,
} from '../../constant/auth';
import env from '../../env';
import buildKeyDerivationMessage from './buildKeyDerivationMessage';

interface AuthClientConfig {
  protocol: {
    signatureStandard: 'SEP-53';
    stellarNetwork: 'public' | 'testnet';
    authDomain: string;
    authMessageVersion: number;
    challengeTtlSeconds: number;
    accessTokenTtlSeconds: number;
  };
  keyDerivation: {
    version: number;
    domain: string;
    message: string;
    signingAlgorithm: 'Ed25519';
    encryptionAlgorithm: 'X25519';
  };
}

const getAuthClientConfig = (walletAddress: string): AuthClientConfig => ({
  protocol: {
    signatureStandard: 'SEP-53',
    stellarNetwork: env.STELLAR_NETWORK,
    authDomain: env.AUTH_DOMAIN,
    authMessageVersion: AUTH_MESSAGE_VERSION,
    challengeTtlSeconds: env.AUTH_CHALLENGE_TTL_SECONDS,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  },
  keyDerivation: {
    version: KEY_DERIVATION_VERSION,
    domain: BESEEN_AUTH_DOMAIN,
    message: buildKeyDerivationMessage({
      walletAddress,
      network: env.STELLAR_NETWORK,
    }),
    signingAlgorithm: 'Ed25519',
    encryptionAlgorithm: 'X25519',
  },
});

export default getAuthClientConfig;
export type { AuthClientConfig };
