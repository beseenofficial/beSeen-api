import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import createLoginChallenge from '../../src/utils/auth/createLoginChallenge';

vi.mock('../../src/utils/auth/createLoginChallenge', () => ({
  default: vi.fn(),
}));

const WALLET_ADDRESS = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const createLoginChallengeMock = vi.mocked(createLoginChallenge);

describe('POST /v1/auth/login/challenge', () => {
  beforeEach(() => {
    createLoginChallengeMock.mockReset();
  });

  it('normalizes the wallet and returns its SEP-10 transaction', async () => {
    createLoginChallengeMock.mockResolvedValue({
      ok: true,
      challengeId: '507f1f77bcf86cd799439011',
      transactionXdr: 'AAAA',
      stellarNetwork: 'testnet',
      networkPassphrase: 'Test SDF Network ; September 2015',
      serverSigningPublicKey: WALLET_ADDRESS,
      homeDomain: 'beseen.app',
      expiresAt: new Date('2026-07-27T12:05:00.000Z'),
    });

    const response = await request(app)
      .post('/v1/auth/login/challenge')
      .send({ walletAddress: WALLET_ADDRESS.toLowerCase() });

    expect(response.status).toBe(201);
    expect(response.body.result).toEqual({
      challengeId: '507f1f77bcf86cd799439011',
      authenticationStandard: 'SEP-10',
      transactionXdr: 'AAAA',
      stellarNetwork: 'testnet',
      networkPassphrase: 'Test SDF Network ; September 2015',
      serverSigningPublicKey: WALLET_ADDRESS,
      homeDomain: 'beseen.app',
      expiresAt: '2026-07-27T12:05:00.000Z',
    });
    expect(createLoginChallengeMock).toHaveBeenCalledWith({ walletAddress: WALLET_ADDRESS });
  });

  it('rejects malformed wallet addresses before database access', async () => {
    const response = await request(app)
      .post('/v1/auth/login/challenge')
      .send({ walletAddress: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(createLoginChallengeMock).not.toHaveBeenCalled();
  });

  it('returns a stable response for unavailable accounts', async () => {
    createLoginChallengeMock.mockResolvedValue({ ok: false, reason: 'account_unavailable' });

    const response = await request(app)
      .post('/v1/auth/login/challenge')
      .send({ walletAddress: WALLET_ADDRESS });

    expect(response.status).toBe(404);
    expect(response.body.result.code).toBe('ACCOUNT_UNAVAILABLE');
  });
});
