import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../../src/app';

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

describe('GET /v1/auth/config', () => {
  it('returns the exact versioned key derivation message for the connected wallet', async () => {
    const response = await request(app)
      .get('/v1/auth/config')
      .query({ walletAddress: WALLET_ADDRESS.toLowerCase() });

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.result).toMatchObject({
      protocol: {
        signatureStandard: 'SEP-53',
        stellarNetwork: 'testnet',
        authDomain: 'beseen.app',
        authMessageVersion: 1,
        challengeTtlSeconds: 300,
        accessTokenTtlSeconds: 900,
      },
      keyDerivation: {
        version: 1,
        domain: 'beseen.app',
        kdf: {
          name: 'HKDF-SHA-256',
          input: 'SEP-53-SIGNATURE',
          inputEncoding: 'base64',
          salt: 'beseen.app/key-derivation/v1',
          seedLengthBytes: 32,
          signingInfo: 'beseen.app/ed25519-signing-key/v1',
          encryptionInfo: 'beseen.app/x25519-encryption-key/v1',
        },
        signingAlgorithm: 'Ed25519',
        encryptionAlgorithm: 'X25519',
      },
    });
    expect(response.body.result.keyDerivation.message).toBe(
      [
        'BeSeen Key Derivation',
        'Version: 1',
        'Domain: beseen.app',
        'Network: PUBLIC',
        `Account: ${WALLET_ADDRESS}`,
        'Purpose: Derive BeSeen identity and private communication keys.',
      ].join('\n'),
    );
  });

  it('rejects missing and invalid wallet addresses', async () => {
    const missingResponse = await request(app).get('/v1/auth/config');
    const invalidResponse = await request(app)
      .get('/v1/auth/config')
      .query({ walletAddress: 'invalid' });

    expect(missingResponse.status).toBe(400);
    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.result.code).toBe('VALIDATION_ERROR');
  });
});
