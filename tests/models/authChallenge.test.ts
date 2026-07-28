import { describe, expect, it } from 'vitest';

import AuthChallenge from '../../src/models/AuthChallenge';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const SIGNING_PUBLIC_KEY = Buffer.alloc(32, 1).toString('base64');
const ENCRYPTION_PUBLIC_KEY = Buffer.alloc(32, 2).toString('base64');
const SEP10_FIELDS = {
  transactionXdr: 'AAAA',
  serverSigningPublicKey: WALLET_ADDRESS,
  stellarNetwork: 'testnet' as const,
  authDomain: 'beseen.app',
};

const registrationChallengeInput = () => ({
  purpose: 'registration' as const,
  walletAddress: WALLET_ADDRESS,
  nonce: 'n'.repeat(43),
  ...SEP10_FIELDS,
  signingPublicKey: SIGNING_PUBLIC_KEY,
  encryptionPublicKey: ENCRYPTION_PUBLIC_KEY,
  derivationVersion: 1,
  expiresAt: new Date(Date.now() + 300_000),
  purgeAt: new Date(Date.now() + 300_000),
});

describe('AuthChallenge model', () => {
  it('accepts a registration challenge with its key binding', async () => {
    const challenge = new AuthChallenge(registrationChallengeInput());

    await challenge.validate();

    expect(challenge.usedAt).toBeNull();
    expect(challenge.attempts).toBe(0);
  });

  it('requires both public keys for registration challenges', async () => {
    const challenge = new AuthChallenge({
      ...registrationChallengeInput(),
      signingPublicKey: null,
      encryptionPublicKey: null,
    });

    await expect(challenge.validate()).rejects.toMatchObject({
      errors: {
        signingPublicKey: expect.anything(),
        encryptionPublicKey: expect.anything(),
      },
    });
  });

  it('allows login challenges without a key binding', async () => {
    const challenge = new AuthChallenge({
      purpose: 'login',
      walletAddress: WALLET_ADDRESS,
      nonce: 'l'.repeat(43),
      ...SEP10_FIELDS,
      expiresAt: new Date(Date.now() + 300_000),
      purgeAt: new Date(Date.now() + 300_000),
    });

    await expect(challenge.validate()).resolves.toBeUndefined();
  });

  it('declares unique nonce and expiration TTL indexes', () => {
    const indexes = AuthChallenge.schema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { nonce: 1 },
          expect.objectContaining({ unique: true, name: 'auth_challenges_nonce_unique' }),
        ],
        [
          { purgeAt: 1 },
          expect.objectContaining({
            expireAfterSeconds: 0,
            name: 'auth_challenges_purge_ttl',
          }),
        ],
      ]),
    );
  });
});
