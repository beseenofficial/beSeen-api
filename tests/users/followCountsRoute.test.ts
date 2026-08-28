import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import getFollowCounts from '../../src/utils/token/getFollowCounts';

vi.mock('../../src/utils/token/getFollowCounts', () => ({ default: vi.fn() }));

const getFollowCountsMock = vi.mocked(getFollowCounts);

describe('GET /v1/users/:username/follow-counts', () => {
  beforeEach(() => getFollowCountsMock.mockReset());

  it('returns both public follow counts', async () => {
    getFollowCountsMock.mockResolvedValue({
      ok: true,
      user: { id: '507f1f77bcf86cd799439011', username: 'alice' },
      followerCount: 42,
      followingCount: 17,
    });

    const response = await request(app).get('/v1/users/Alice/follow-counts');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      user: { id: '507f1f77bcf86cd799439011', username: 'alice' },
      followerCount: 42,
      followingCount: 17,
    });
    expect(getFollowCountsMock).toHaveBeenCalledWith('alice');
  });

  it('returns 404 for a missing user', async () => {
    getFollowCountsMock.mockResolvedValue({ ok: false, reason: 'user_not_found' });

    const response = await request(app).get('/v1/users/missing_user/follow-counts');

    expect(response.status).toBe(404);
    expect(response.body.result.code).toBe('USER_NOT_FOUND');
  });
});
