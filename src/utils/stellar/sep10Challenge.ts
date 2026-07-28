import { timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';

import type { StellarNetwork } from '../../constant/auth';
import env from '../../env';

const MAX_SEP10_XDR_LENGTH = 16_384;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

interface StellarKeypair {
  publicKey(): string;
}

interface StellarTransaction {
  hash(): Buffer;
  timeBounds?: { maxTime: string };
}

interface ReadChallengeResult {
  clientAccountID: string;
  tx: StellarTransaction;
}

interface StellarSep10Api {
  Keypair: {
    fromSecret(secret: string): StellarKeypair;
  };
  Networks: {
    PUBLIC: string;
    TESTNET: string;
  };
  WebAuth: {
    buildChallengeTx(
      serverKeypair: StellarKeypair,
      clientAccountId: string,
      homeDomain: string,
      timeout: number,
      networkPassphrase: string,
      webAuthDomain: string,
    ): string;
    readChallengeTx(
      challengeXdr: string,
      serverAccountId: string,
      networkPassphrase: string,
      homeDomains: string | string[],
      webAuthDomain: string,
    ): ReadChallengeResult;
    verifyChallengeTxSigners(
      challengeXdr: string,
      serverAccountId: string,
      networkPassphrase: string,
      signers: string[],
      homeDomains: string | string[],
      webAuthDomain: string,
    ): string[];
  };
}

const stellarSdk = createRequire(__filename)('@stellar/stellar-sdk') as StellarSep10Api;

interface Sep10Challenge {
  transactionXdr: string;
  networkPassphrase: string;
  serverSigningPublicKey: string;
  homeDomain: string;
  stellarNetwork: StellarNetwork;
  expiresAt: Date;
}

interface VerifySep10ChallengeInput {
  signedTransactionXdr: string;
  storedTransactionXdr: string;
  walletAddress: string;
  serverSigningPublicKey: string;
  stellarNetwork: StellarNetwork;
  homeDomain: string;
}

const networkPassphraseFor = (network: StellarNetwork): string =>
  network === 'public' ? stellarSdk.Networks.PUBLIC : stellarSdk.Networks.TESTNET;

const isCanonicalBase64Xdr = (value: string): boolean => {
  if (value.length === 0 || value.length > MAX_SEP10_XDR_LENGTH || !BASE64_PATTERN.test(value)) {
    return false;
  }

  return Buffer.from(value, 'base64').toString('base64') === value;
};

const buildSep10Challenge = (walletAddress: string): Sep10Challenge => {
  const serverKeypair = stellarSdk.Keypair.fromSecret(env.AUTH_SIGNING_SECRET);
  const networkPassphrase = networkPassphraseFor(env.STELLAR_NETWORK);
  const transactionXdr = stellarSdk.WebAuth.buildChallengeTx(
    serverKeypair,
    walletAddress,
    env.AUTH_DOMAIN,
    env.AUTH_CHALLENGE_TTL_SECONDS,
    networkPassphrase,
    env.AUTH_DOMAIN,
  );
  const parsedChallenge = stellarSdk.WebAuth.readChallengeTx(
    transactionXdr,
    serverKeypair.publicKey(),
    networkPassphrase,
    env.AUTH_DOMAIN,
    env.AUTH_DOMAIN,
  );
  const maxTime = parsedChallenge.tx.timeBounds?.maxTime;

  if (!maxTime) {
    throw new Error('SEP-10 challenge is missing its expiration time');
  }

  return {
    transactionXdr,
    networkPassphrase,
    serverSigningPublicKey: serverKeypair.publicKey(),
    homeDomain: env.AUTH_DOMAIN,
    stellarNetwork: env.STELLAR_NETWORK,
    expiresAt: new Date(Number(maxTime) * 1_000),
  };
};

const verifySep10Challenge = ({
  signedTransactionXdr,
  storedTransactionXdr,
  walletAddress,
  serverSigningPublicKey,
  stellarNetwork,
  homeDomain,
}: VerifySep10ChallengeInput): boolean => {
  if (!isCanonicalBase64Xdr(signedTransactionXdr) || !isCanonicalBase64Xdr(storedTransactionXdr)) {
    return false;
  }

  try {
    const networkPassphrase = networkPassphraseFor(stellarNetwork);
    const stored = stellarSdk.WebAuth.readChallengeTx(
      storedTransactionXdr,
      serverSigningPublicKey,
      networkPassphrase,
      homeDomain,
      homeDomain,
    );
    const submitted = stellarSdk.WebAuth.readChallengeTx(
      signedTransactionXdr,
      serverSigningPublicKey,
      networkPassphrase,
      homeDomain,
      homeDomain,
    );

    if (
      stored.clientAccountID !== walletAddress ||
      submitted.clientAccountID !== walletAddress ||
      !timingSafeEqual(stored.tx.hash(), submitted.tx.hash())
    ) {
      return false;
    }

    const signers = stellarSdk.WebAuth.verifyChallengeTxSigners(
      signedTransactionXdr,
      serverSigningPublicKey,
      networkPassphrase,
      [walletAddress],
      homeDomain,
      homeDomain,
    );

    return signers.length === 1 && signers[0] === walletAddress;
  } catch {
    return false;
  }
};

export { buildSep10Challenge, isCanonicalBase64Xdr, networkPassphraseFor, verifySep10Challenge };
export type { Sep10Challenge, VerifySep10ChallengeInput };
