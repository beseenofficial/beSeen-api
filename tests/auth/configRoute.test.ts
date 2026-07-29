import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../src/app';
import env from '../../src/env';

describe('GET /v1/auth/config', () => {
  it('returns the client-only deterministic key and proof contract', async () => {
    const response = await request(app).get('/v1/auth/config');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.result).toMatchObject({
      stellarNetwork: env.STELLAR_NETWORK,
      networkPassphrase: expect.any(String),
      keyDerivation: {
        version: 1,
        source: 'STELLAR_WALLET_FIXED_TRANSACTION_SIGNATURE',
        walletMethod: 'signTransaction',
        transaction: {
          builtBy: 'client',
          sourceAccount: 'connected-wallet',
          sequence: '0',
          feeStroops: '100',
          timeBounds: { minTime: '0', maxTime: '0' },
          operation: {
            type: 'manageData',
            name: 'beseen_kdf_v1',
            value: 'beseen.app/key-derivation/v1',
          },
          submissionRequired: false,
        },
        signature: {
          input: 'RAW-64-BYTE-STELLAR-TRANSACTION-SIGNATURE',
          lengthBytes: 64,
          sentToServer: false,
        },
        privateKeyStorage: 'client-only',
      },
      registration: {
        mode: 'DEMO_CLIENT_DECLARATION',
        walletPublicKeyValidation: 'STELLAR_G_ADDRESS_FORMAT_ONLY',
        additionalWalletSignatureRequired: false,
        serverChallengeRequired: false,
        productionReady: false,
      },
      login: {
        proof: 'DERIVED_ED25519_SIGNATURE',
        serverChallengeRequired: false,
      },
      session: {
        accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
        refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
        refreshEndpoint: '/v1/auth/refresh',
        currentUserEndpoint: '/v1/users/me',
        accessTokenStorage: 'memory',
        refreshTokenStorage: 'persistent-client-storage',
        refreshTokenRotationRequired: true,
      },
    });
    expect(response.body.result).not.toHaveProperty('serverSigningPublicKey');
  });
});
