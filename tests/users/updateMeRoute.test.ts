import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import updateCurrentUser from '../../src/utils/user/updateCurrentUser';

vi.mock('../../src/utils/user/updateCurrentUser', () => ({
  default: vi.fn(),
}));

const updateCurrentUserMock = vi.mocked(updateCurrentUser);
const userId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const accessToken = signAccessToken(
  { id: userId, role: 'user', accountType: 'regular' },
  sessionId,
);

describe('PATCH /v1/users/me', () => {
  beforeEach(() => {
    updateCurrentUserMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes and forwards only supplied profile fields', async () => {
    updateCurrentUserMock.mockResolvedValue({
      ok: true,
      user: {
        id: userId.toString(),
        walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
        username: 'new_username',
        displayName: 'New Name',
        bio: '',
        avatarUrl: null,
        accountType: 'regular',
        creatorProfile: null,
        createdAt: new Date('2026-07-01T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: '  New_Username ', displayName: ' New Name ' });

    expect(response.status).toBe(200);
    expect(response.body.result.user).toMatchObject({
      username: 'new_username',
      displayName: 'New Name',
      createdAt: '2026-07-01T12:00:00.000Z',
    });
    expect(updateCurrentUserMock).toHaveBeenCalledWith(userId.toString(), {
      username: 'new_username',
      displayName: 'New Name',
    });
  });

  it('rejects empty updates and reports incomplete creator promotions', async () => {
    const emptyResponse = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    updateCurrentUserMock.mockResolvedValue({
      ok: false,
      reason: 'creator_profile_required',
    });
    const promotionResponse = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ accountType: 'creator', creatorProfile: { headline: 'Incomplete' } });

    expect(emptyResponse.status).toBe(400);
    expect(promotionResponse.status).toBe(400);
    expect(promotionResponse.body.result.code).toBe('CREATOR_PROFILE_REQUIRED');
    expect(updateCurrentUserMock).toHaveBeenCalledWith(
      userId.toString(),
      expect.objectContaining({
        accountType: 'creator',
        creatorProfile: { headline: 'Incomplete' },
      }),
    );
  });

  it('returns a stable username conflict', async () => {
    updateCurrentUserMock.mockResolvedValue({ ok: false, reason: 'username_taken' });

    const response = await request(app)
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ username: 'taken_name' });

    expect(response.status).toBe(409);
    expect(response.body.result.code).toBe('USERNAME_TAKEN');
  });
});
