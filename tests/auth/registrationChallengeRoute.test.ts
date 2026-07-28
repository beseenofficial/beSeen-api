import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import createRegistrationChallenge from '../../src/utils/auth/createRegistrationChallenge';

vi.mock('../../src/utils/auth/createRegistrationChallenge', () => ({
  default: vi.fn(),
}));

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const SIGNING_PUBLIC_KEY = Buffer.alloc(32, 1).toString('base64');
const ENCRYPTION_PUBLIC_KEY = Buffer.alloc(32, 2).toString('base64');

const validBody = () => ({
  walletAddress: WALLET_ADDRESS.toLowerCase(),
  keys: {
    derivationVersion: 1,
    signing: {
      algorithm: 'Ed25519',
      publicKey: SIGNING_PUBLIC_KEY,
    },
    encryption: {
      algorithm: 'X25519',
      publicKey: ENCRYPTION_PUBLIC_KEY,
    },
  },
});

const createChallengeMock = vi.mocked(createRegistrationChallenge);

describe('POST /v1/auth/registration/challenge', () => {
  beforeEach(() => {
    createChallengeMock.mockReset();
  });

  it('creates a short-lived registration challenge', async () => {
    createChallengeMock.mockResolvedValue({
      ok: true,
      challengeId: '507f1f77bcf86cd799439011',
      transactionXdr: 'AAAA',
      stellarNetwork: 'testnet',
      networkPassphrase: 'Test SDF Network ; September 2015',
      serverSigningPublicKey: WALLET_ADDRESS,
      homeDomain: 'beseen.app',
      expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    });

    const response = await request(app).post('/v1/auth/registration/challenge').send(validBody());

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      status: 'success',
      message: 'Registration challenge created',
      result: {
        challengeId: '507f1f77bcf86cd799439011',
        authenticationStandard: 'SEP-10',
        transactionXdr: 'AAAA',
        stellarNetwork: 'testnet',
        networkPassphrase: 'Test SDF Network ; September 2015',
        serverSigningPublicKey: WALLET_ADDRESS,
        homeDomain: 'beseen.app',
        expiresAt: '2026-07-27T12:05:00.000Z',
      },
    });
    expect(createChallengeMock).toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: WALLET_ADDRESS }),
    );
  });

  it('rejects malformed request bodies before database access', async () => {
    const body = validBody();
    body.keys.signing.algorithm = 'ECDSA';

    const response = await request(app).post('/v1/auth/registration/challenge').send(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      status: 'error',
      message: 'Invalid registration challenge request',
      result: {
        code: 'VALIDATION_ERROR',
      },
    });
    expect(createChallengeMock).not.toHaveBeenCalled();
  });

  it('rejects reuse of one public key for signing and encryption', async () => {
    const body = validBody();
    body.keys.encryption.publicKey = body.keys.signing.publicKey;

    const response = await request(app).post('/v1/auth/registration/challenge').send(body);

    expect(response.status).toBe(400);
    expect(response.body.result).toMatchObject({
      code: 'VALIDATION_ERROR',
      issues: [
        {
          path: 'keys.encryption.publicKey',
          message: 'Signing and encryption public keys must be different',
        },
      ],
    });
    expect(createChallengeMock).not.toHaveBeenCalled();
  });

  it('rejects wallets that already have a BeSeen account', async () => {
    createChallengeMock.mockResolvedValue({
      ok: false,
      reason: 'wallet_already_registered',
    });

    const response = await request(app).post('/v1/auth/registration/challenge').send(validBody());

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      status: 'error',
      message: 'Wallet is already registered',
      result: {
        code: 'WALLET_ALREADY_REGISTERED',
      },
    });
  });

  it('rejects public keys that are already bound to another account', async () => {
    createChallengeMock.mockResolvedValue({
      ok: false,
      reason: 'public_key_already_registered',
    });

    const response = await request(app).post('/v1/auth/registration/challenge').send(validBody());

    expect(response.status).toBe(409);
    expect(response.body.result.code).toBe('PUBLIC_KEY_ALREADY_REGISTERED');
  });
});
