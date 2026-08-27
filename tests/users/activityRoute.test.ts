import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import recordUserActivity from '../../src/utils/user/recordUserActivity';

vi.mock('../../src/utils/user/recordUserActivity', () => ({ default: vi.fn() }));

const recordUserActivityMock = vi.mocked(recordUserActivity);
const userId = new Types.ObjectId();
const sessionId = new Types.ObjectId();

describe('POST /v1/users/me/activity', () => {
  beforeEach(() => recordUserActivityMock.mockReset());

  afterEach(() => vi.restoreAllMocks());

  it('records an authenticated heartbeat and serializes its timestamp', async () => {
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
    recordUserActivityMock.mockResolvedValue({
      ok: true,
      activity: {
        creditedSeconds: 60,
        lastActiveAt: new Date('2026-08-27T12:00:00.000Z'),
        isOnline: true,
      },
    });
    const token = signAccessToken({ id: userId, role: 'user' }, sessionId);

    const response = await request(app)
      .post('/v1/users/me/activity')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.result.activity).toEqual({
      creditedSeconds: 60,
      lastActiveAt: '2026-08-27T12:00:00.000Z',
      isOnline: true,
    });
    expect(recordUserActivityMock).toHaveBeenCalledWith(userId.toString());
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/v1/users/me/activity');

    expect(response.status).toBe(401);
    expect(recordUserActivityMock).not.toHaveBeenCalled();
  });
});
