import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';
import type { Transaction } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';

import {
  buildSep10Challenge,
  isCanonicalBase64Xdr,
  verifySep10Challenge,
} from '../../src/utils/stellar/sep10Challenge';

const wallet = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 9));
const otherWallet = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 10));

const signChallenge = (
  transactionXdr: string,
  networkPassphrase: string,
  ...signers: Keypair[]
): string => {
  const transaction = TransactionBuilder.fromXDR(transactionXdr, networkPassphrase) as Transaction;

  for (const signer of signers) {
    transaction.sign(signer);
  }

  return transaction.toEnvelope().toXDR('base64').toString();
};

describe('SEP-10 challenge verification', () => {
  it('accepts the exact challenge signed by its client account', () => {
    const challenge = buildSep10Challenge(wallet.publicKey());
    const signedTransactionXdr = signChallenge(
      challenge.transactionXdr,
      challenge.networkPassphrase,
      wallet,
    );

    expect(
      verifySep10Challenge({
        signedTransactionXdr,
        storedTransactionXdr: challenge.transactionXdr,
        walletAddress: wallet.publicKey(),
        serverSigningPublicKey: challenge.serverSigningPublicKey,
        stellarNetwork: challenge.stellarNetwork,
        homeDomain: challenge.homeDomain,
      }),
    ).toBe(true);
  });

  it('rejects unsigned, wrong-wallet, and extra-signer transactions', () => {
    const challenge = buildSep10Challenge(wallet.publicKey());
    const input = {
      storedTransactionXdr: challenge.transactionXdr,
      walletAddress: wallet.publicKey(),
      serverSigningPublicKey: challenge.serverSigningPublicKey,
      stellarNetwork: challenge.stellarNetwork,
      homeDomain: challenge.homeDomain,
    };

    expect(
      verifySep10Challenge({
        ...input,
        signedTransactionXdr: challenge.transactionXdr,
      }),
    ).toBe(false);
    expect(
      verifySep10Challenge({
        ...input,
        signedTransactionXdr: signChallenge(
          challenge.transactionXdr,
          challenge.networkPassphrase,
          otherWallet,
        ),
      }),
    ).toBe(false);
    expect(
      verifySep10Challenge({
        ...input,
        signedTransactionXdr: signChallenge(
          challenge.transactionXdr,
          challenge.networkPassphrase,
          wallet,
          otherWallet,
        ),
      }),
    ).toBe(false);
  });

  it('binds challengeId storage to the exact transaction hash', () => {
    const stored = buildSep10Challenge(wallet.publicKey());
    const substituted = buildSep10Challenge(wallet.publicKey());
    const signedSubstitute = signChallenge(
      substituted.transactionXdr,
      substituted.networkPassphrase,
      wallet,
    );

    expect(
      verifySep10Challenge({
        signedTransactionXdr: signedSubstitute,
        storedTransactionXdr: stored.transactionXdr,
        walletAddress: wallet.publicKey(),
        serverSigningPublicKey: stored.serverSigningPublicKey,
        stellarNetwork: stored.stellarNetwork,
        homeDomain: stored.homeDomain,
      }),
    ).toBe(false);
  });

  it('rejects malformed, non-canonical, and wrong-network XDR', () => {
    const challenge = buildSep10Challenge(wallet.publicKey());
    const signedTransactionXdr = signChallenge(
      challenge.transactionXdr,
      challenge.networkPassphrase,
      wallet,
    );
    const input = {
      storedTransactionXdr: challenge.transactionXdr,
      walletAddress: wallet.publicKey(),
      serverSigningPublicKey: challenge.serverSigningPublicKey,
      stellarNetwork: challenge.stellarNetwork,
      homeDomain: challenge.homeDomain,
    };

    expect(isCanonicalBase64Xdr(signedTransactionXdr)).toBe(true);
    expect(isCanonicalBase64Xdr(`${signedTransactionXdr}\n`)).toBe(false);
    expect(verifySep10Challenge({ ...input, signedTransactionXdr: 'invalid' })).toBe(false);
    expect(
      verifySep10Challenge({
        ...input,
        signedTransactionXdr,
        stellarNetwork: challenge.stellarNetwork === 'public' ? 'testnet' : 'public',
      }),
    ).toBe(false);
  });
});
