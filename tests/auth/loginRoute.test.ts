import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import loginUser from '../../src/utils/auth/loginUser';

vi.mock('../../src/utils/auth/loginUser', () => ({ default: vi.fn() }));

const loginUserMock = vi.mocked(loginUser);
const validBody = () => ({
  walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
  requestId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
  issuedAt: '2026-07-27T12:00:00.000Z',
  signature: Buffer.alloc(64, 3).toString('base64'),
});

describe('POST /v1/auth/login', () => {
  beforeEach(() => loginUserMock.mockReset());

  it('logs in with a derived-key signature without a server challenge', async () => {
    loginUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: '507f1f77bcf86cd799439012',
        username: 'user_name',
        avatar: null,
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
      auth: {
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshTokenExpiresAt: new Date('2026-08-26T12:00:00.000Z'),
      },
    });

    const response = await request(app).post('/v1/auth/login').send(validBody());
    expect(response.status).toBe(200);
    expect(response.body.result.user).toMatchObject({ username: 'user_name', avatar: null });
  });

  it('maps invalid and replayed proofs', async () => {
    loginUserMock.mockResolvedValueOnce({ ok: false, reason: 'invalid_signature' });
    const invalid = await request(app).post('/v1/auth/login').send(validBody());
    loginUserMock.mockResolvedValueOnce({ ok: false, reason: 'proof_replayed' });
    const replay = await request(app).post('/v1/auth/login').send(validBody());

    expect(invalid.status).toBe(401);
    expect(invalid.body.result.code).toBe('INVALID_LOGIN_SIGNATURE');
    expect(replay.status).toBe(409);
  });
});
