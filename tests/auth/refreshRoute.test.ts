import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import refreshAuthSession from '../../src/utils/auth/refreshAuthSession';

vi.mock('../../src/utils/auth/refreshAuthSession', () => ({
  default: vi.fn(),
}));

const refreshAuthSessionMock = vi.mocked(refreshAuthSession);
const REFRESH_TOKEN = 'r'.repeat(43);

describe('POST /v1/auth/refresh', () => {
  beforeEach(() => {
    refreshAuthSessionMock.mockReset();
  });

  it('rotates the refresh token and returns a fresh access token', async () => {
    refreshAuthSessionMock.mockResolvedValue({
      ok: true,
      auth: {
        accessToken: 'new-access-token',
        refreshToken: 'n'.repeat(43),
        tokenType: 'Bearer',
        expiresIn: 900,
        refreshTokenExpiresAt: new Date('2026-08-26T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: REFRESH_TOKEN });

    expect(response.status).toBe(200);
    expect(response.body.result.auth).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'n'.repeat(43),
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshTokenExpiresAt: '2026-08-26T12:00:00.000Z',
    });
    expect(refreshAuthSessionMock).toHaveBeenCalledWith(REFRESH_TOKEN);
  });

  it('returns stable errors for malformed and invalid refresh tokens', async () => {
    const malformedResponse = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: 'invalid' });

    refreshAuthSessionMock.mockResolvedValue({
      ok: false,
      reason: 'refresh_token_invalid',
    });
    const invalidResponse = await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: REFRESH_TOKEN });

    expect(malformedResponse.status).toBe(400);
    expect(invalidResponse.status).toBe(401);
    expect(invalidResponse.body.result.code).toBe('REFRESH_TOKEN_INVALID');
  });
});
