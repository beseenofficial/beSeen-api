import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import loginUser from '../../src/utils/auth/loginUser';

vi.mock('../../src/utils/auth/loginUser', () => ({
  default: vi.fn(),
}));

const loginUserMock = vi.mocked(loginUser);
const validBody = () => ({
  challengeId: '507f1f77bcf86cd799439011',
  signature: Buffer.alloc(64, 3).toString('base64'),
});

describe('POST /v1/auth/login', () => {
  beforeEach(() => {
    loginUserMock.mockReset();
  });

  it('returns the same user and auth contract as registration', async () => {
    loginUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: '507f1f77bcf86cd799439012',
        walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
        username: 'creator_user',
        displayName: 'Creator User',
        bio: 'Creator bio',
        avatarUrl: null,
        accountType: 'creator',
        creatorProfile: {
          headline: 'Visual storyteller',
          categories: ['photography'],
          skills: ['editing'],
          websiteUrl: null,
          isAvailableForWork: true,
        },
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
      },
      auth: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshTokenExpiresAt: new Date('2026-08-26T12:00:00.000Z'),
      },
    });

    const response = await request(app).post('/v1/auth/login').send(validBody());

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({
      user: {
        username: 'creator_user',
        accountType: 'creator',
        createdAt: '2026-07-27T12:00:00.000Z',
      },
      auth: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshTokenExpiresAt: '2026-08-26T12:00:00.000Z',
      },
    });
  });

  it('rejects malformed signatures before calling the login service', async () => {
    const response = await request(app)
      .post('/v1/auth/login')
      .send({ ...validBody(), signature: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(loginUserMock).not.toHaveBeenCalled();
  });

  it('maps invalid signatures and exhausted attempts to stable errors', async () => {
    loginUserMock.mockResolvedValueOnce({
      ok: false,
      reason: 'invalid_signature',
      attemptsRemaining: 3,
    });
    const invalidResponse = await request(app).post('/v1/auth/login').send(validBody());

    loginUserMock.mockResolvedValueOnce({ ok: false, reason: 'attempts_exceeded' });
    const attemptsResponse = await request(app).post('/v1/auth/login').send(validBody());

    expect(invalidResponse.status).toBe(401);
    expect(invalidResponse.body.result).toEqual({
      code: 'INVALID_STELLAR_SIGNATURE',
      attemptsRemaining: 3,
    });
    expect(attemptsResponse.status).toBe(429);
    expect(attemptsResponse.body.result.code).toBe('VERIFICATION_ATTEMPTS_EXCEEDED');
  });
});
