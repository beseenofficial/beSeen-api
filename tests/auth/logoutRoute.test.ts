import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';

const userId = new Types.ObjectId();

const sessionId = new Types.ObjectId();

const queryResult = <T>(value: T) => ({ exec: vi.fn().mockResolvedValue(value) });

const accessToken = () => signAccessToken({ id: userId, role: 'user' }, sessionId);

describe('POST /v1/auth/logout', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('revokes the current session and immediately rejects the same access token', async () => {
    vi.spyOn(AuthSession, 'exists')
      .mockResolvedValueOnce({ _id: sessionId })
      .mockResolvedValueOnce(null);
    const updateSpy = vi
      .spyOn(AuthSession, 'updateOne')
      .mockReturnValue(queryResult({ modifiedCount: 1 }) as never);

    const token = accessToken();

    const logoutResponse = await request(app)
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    const reuseResponse = await request(app)
      .post('/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body).toEqual({
      status: 'success',
      message: 'Logout successful',
      result: {},
    });
    expect(reuseResponse.status).toBe(401);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(
      { _id: sessionId.toString(), user: userId.toString(), revokedAt: null },
      { $set: { revokedAt: expect.any(Date) } },
    );
  });

  it('requires a Bearer access token', async () => {
    const updateSpy = vi.spyOn(AuthSession, 'updateOne');

    const response = await request(app).post('/v1/auth/logout');

    expect(response.status).toBe(401);
    expect(response.body.result.code).toBe('UNAUTHORIZED');
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
