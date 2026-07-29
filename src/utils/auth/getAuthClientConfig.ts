import {
  KEY_DERIVATION_ENCRYPTION_INFO,
  KEY_DERIVATION_INPUT,
  KEY_DERIVATION_INPUT_ENCODING,
  KEY_DERIVATION_INPUT_LENGTH_BYTES,
  KEY_DERIVATION_KDF,
  KEY_DERIVATION_SALT,
  KEY_DERIVATION_SEED_LENGTH_BYTES,
  KEY_DERIVATION_SIGNING_INFO,
  KEY_DERIVATION_TRANSACTION_DATA_NAME,
  KEY_DERIVATION_TRANSACTION_DATA_VALUE,
  KEY_DERIVATION_TRANSACTION_FEE_STROOPS,
  KEY_DERIVATION_TRANSACTION_MAX_TIME,
  KEY_DERIVATION_TRANSACTION_MIN_TIME,
  KEY_DERIVATION_TRANSACTION_OPERATION,
  KEY_DERIVATION_TRANSACTION_SEQUENCE,
  KEY_DERIVATION_VERSION,
  LOGIN_PROOF_MAX_AGE_SECONDS,
  LOGIN_PROOF_VERSION,
} from '../../constant/auth';
import env from '../../env';
import networkPassphraseFor from '../stellar/networkPassphraseFor';

const getAuthClientConfig = () => ({
  stellarNetwork: env.STELLAR_NETWORK,
  networkPassphrase: networkPassphraseFor(env.STELLAR_NETWORK),
  keyDerivation: {
    version: KEY_DERIVATION_VERSION,
    source: 'STELLAR_WALLET_FIXED_TRANSACTION_SIGNATURE' as const,
    walletMethod: 'signTransaction' as const,
    transaction: {
      builtBy: 'client' as const,
      sourceAccount: 'connected-wallet' as const,
      sequence: KEY_DERIVATION_TRANSACTION_SEQUENCE,
      feeStroops: KEY_DERIVATION_TRANSACTION_FEE_STROOPS,
      timeBounds: {
        minTime: KEY_DERIVATION_TRANSACTION_MIN_TIME,
        maxTime: KEY_DERIVATION_TRANSACTION_MAX_TIME,
      },
      memo: 'none' as const,
      operation: {
        type: KEY_DERIVATION_TRANSACTION_OPERATION,
        name: KEY_DERIVATION_TRANSACTION_DATA_NAME,
        value: KEY_DERIVATION_TRANSACTION_DATA_VALUE,
      },
      submissionRequired: false as const,
    },
    signature: {
      input: KEY_DERIVATION_INPUT,
      encoding: KEY_DERIVATION_INPUT_ENCODING,
      lengthBytes: KEY_DERIVATION_INPUT_LENGTH_BYTES,
      sentToServer: false as const,
    },
    kdf: {
      name: KEY_DERIVATION_KDF,
      input: KEY_DERIVATION_INPUT,
      inputEncoding: KEY_DERIVATION_INPUT_ENCODING,
      salt: KEY_DERIVATION_SALT,
      seedLengthBytes: KEY_DERIVATION_SEED_LENGTH_BYTES,
      signingInfo: KEY_DERIVATION_SIGNING_INFO,
      encryptionInfo: KEY_DERIVATION_ENCRYPTION_INFO,
    },
    signingAlgorithm: 'Ed25519' as const,
    encryptionAlgorithm: 'X25519' as const,
    privateKeyStorage: 'client-only' as const,
  },
  registration: {
    mode: 'DEMO_CLIENT_DECLARATION' as const,
    walletPublicKeyValidation: 'STELLAR_G_ADDRESS_FORMAT_ONLY' as const,
    derivedPublicKeyValidation: 'ALGORITHM_AND_LENGTH_ONLY' as const,
    additionalWalletSignatureRequired: false as const,
    serverChallengeRequired: false as const,
    productionReady: false as const,
  },
  login: {
    proof: 'DERIVED_ED25519_SIGNATURE' as const,
    version: LOGIN_PROOF_VERSION,
    maxAgeSeconds: LOGIN_PROOF_MAX_AGE_SECONDS,
    serverChallengeRequired: false as const,
  },
  session: {
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
    refreshEndpoint: '/v1/auth/refresh' as const,
    currentUserEndpoint: '/v1/users/me' as const,
    accessTokenStorage: 'memory' as const,
    refreshTokenStorage: 'persistent-client-storage' as const,
    refreshTokenRotationRequired: true as const,
  },
});

export default getAuthClientConfig;
export type AuthClientConfig = ReturnType<typeof getAuthClientConfig>;
