import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import getCurrentUser from '../../src/utils/user/getCurrentUser';
import signAccessToken from '../../src/utils/auth/signAccessToken';

vi.mock('../../src/utils/user/getCurrentUser', () => ({
  default: vi.fn(),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);

const userId = new Types.ObjectId();

const sessionId = new Types.ObjectId();

const accessToken = () => signAccessToken({ id: userId, role: 'user' }, sessionId);

describe('GET /v1/users/me', () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the current user for an active Bearer session', async () => {
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
    getCurrentUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: userId.toString(),
        walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
        username: 'sample_user',
        avatar: null,
        bio: 'Private social, made simple',
        createdAt: new Date('2026-07-01T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.result.user).toMatchObject({
      id: userId.toString(),
      username: 'sample_user',
      avatar: null,
      bio: 'Private social, made simple',
      createdAt: '2026-07-01T12:00:00.000Z',
    });
    expect(AuthSession.exists).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: sessionId.toString(),
        user: userId.toString(),
        revokedAt: null,
      }),
    );
    expect(getCurrentUserMock).toHaveBeenCalledWith(userId.toString());
  });

  it('rejects missing, malformed, and cryptographically invalid Bearer tokens', async () => {
    const sessionSpy = vi.spyOn(AuthSession, 'exists');

    const missingResponse = await request(app).get('/v1/users/me');

    const malformedResponse = await request(app)
      .get('/v1/users/me')
      .set('Authorization', 'Token invalid');

    const invalidResponse = await request(app)
      .get('/v1/users/me')
      .set('Authorization', 'Bearer invalid');

    expect(missingResponse.status).toBe(401);
    expect(malformedResponse.status).toBe(401);
    expect(invalidResponse.status).toBe(401);
    expect(sessionSpy).not.toHaveBeenCalled();
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });

  it('rejects an access token after its session is revoked or expired', async () => {
    vi.spyOn(AuthSession, 'exists').mockResolvedValue(null);

    const response = await request(app)
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(401);
    expect(response.body.result.code).toBe('UNAUTHORIZED');
    expect(getCurrentUserMock).not.toHaveBeenCalled();
  });
});
