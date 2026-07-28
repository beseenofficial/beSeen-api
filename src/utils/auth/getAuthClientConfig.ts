import {
  KEY_DERIVATION_ENCRYPTION_INFO,
  KEY_DERIVATION_INPUT,
  KEY_DERIVATION_INPUT_ENCODING,
  KEY_DERIVATION_KDF,
  KEY_DERIVATION_SALT,
  KEY_DERIVATION_SEED_LENGTH_BYTES,
  KEY_DERIVATION_SIGNING_INFO,
  KEY_DERIVATION_VERSION,
} from '../../constant/auth';
import env from '../../env';
import { networkPassphraseFor } from '../stellar/sep10Challenge';
import { createRequire } from 'node:module';

interface StellarKeyApi {
  Keypair: { fromSecret(secret: string): { publicKey(): string } };
}

const stellarSdk = createRequire(__filename)('@stellar/stellar-sdk') as StellarKeyApi;

interface AuthClientConfig {
  protocol: {
    authenticationStandard: 'SEP-10';
    challengeFormat: 'stellar-transaction-xdr';
    walletMethod: 'signTransaction';
    stellarNetwork: 'public' | 'testnet';
    networkPassphrase: string;
    authDomain: string;
    serverSigningPublicKey: string;
    transactionSubmissionRequired: false;
    challengeTtlSeconds: number;
    accessTokenTtlSeconds: number;
  };
  keyDerivation: {
    version: number;
    source: 'CLIENT_GENERATED';
    kdf: {
      name: 'HKDF-SHA-256';
      input: 'CLIENT-RANDOM-32-BYTE-MASTER-SECRET';
      inputEncoding: 'raw-bytes';
      salt: string;
      seedLengthBytes: number;
      signingInfo: string;
      encryptionInfo: string;
    };
    signingAlgorithm: 'Ed25519';
    encryptionAlgorithm: 'X25519';
  };
}

const getAuthClientConfig = (): AuthClientConfig => ({
  protocol: {
    authenticationStandard: 'SEP-10',
    challengeFormat: 'stellar-transaction-xdr',
    walletMethod: 'signTransaction',
    stellarNetwork: env.STELLAR_NETWORK,
    networkPassphrase: networkPassphraseFor(env.STELLAR_NETWORK),
    authDomain: env.AUTH_DOMAIN,
    serverSigningPublicKey: stellarSdk.Keypair.fromSecret(env.AUTH_SIGNING_SECRET).publicKey(),
    transactionSubmissionRequired: false,
    challengeTtlSeconds: env.AUTH_CHALLENGE_TTL_SECONDS,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
  },
  keyDerivation: {
    version: KEY_DERIVATION_VERSION,
    source: 'CLIENT_GENERATED',
    kdf: {
      name: KEY_DERIVATION_KDF,
      input: KEY_DERIVATION_INPUT,
      inputEncoding: KEY_DERIVATION_INPUT_ENCODING,
      salt: KEY_DERIVATION_SALT,
      seedLengthBytes: KEY_DERIVATION_SEED_LENGTH_BYTES,
      signingInfo: KEY_DERIVATION_SIGNING_INFO,
      encryptionInfo: KEY_DERIVATION_ENCRYPTION_INFO,
    },
    signingAlgorithm: 'Ed25519',
    encryptionAlgorithm: 'X25519',
  },
});

export default getAuthClientConfig;
export type { AuthClientConfig };
