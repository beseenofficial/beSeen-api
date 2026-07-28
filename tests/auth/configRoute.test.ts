import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../src/app';
import env from '../../src/env';

describe('GET /v1/auth/config', () => {
  it('returns the SEP-10 and client-generated key contract', async () => {
    const response = await request(app).get('/v1/auth/config');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.result).toMatchObject({
      protocol: {
        authenticationStandard: 'SEP-10',
        challengeFormat: 'stellar-transaction-xdr',
        walletMethod: 'signTransaction',
        stellarNetwork: env.STELLAR_NETWORK,
        authDomain: env.AUTH_DOMAIN,
        serverSigningPublicKey: expect.stringMatching(/^G[A-Z2-7]{55}$/),
        transactionSubmissionRequired: false,
        challengeTtlSeconds: 300,
        accessTokenTtlSeconds: 900,
      },
      keyDerivation: {
        version: 1,
        source: 'CLIENT_GENERATED',
        kdf: {
          name: 'HKDF-SHA-256',
          input: 'CLIENT-RANDOM-32-BYTE-MASTER-SECRET',
          inputEncoding: 'raw-bytes',
          salt: 'beseen.app/key-derivation/v1',
          seedLengthBytes: 32,
          signingInfo: 'beseen.app/ed25519-signing-key/v1',
          encryptionInfo: 'beseen.app/x25519-encryption-key/v1',
        },
        signingAlgorithm: 'Ed25519',
        encryptionAlgorithm: 'X25519',
      },
    });
    expect(response.body.result.protocol.networkPassphrase).toBeTruthy();
  });

  it('does not require a wallet address because configuration is public and static', async () => {
    const response = await request(app).get('/v1/auth/config');
    expect(response.status).toBe(200);
  });
});
