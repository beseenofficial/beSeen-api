import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import getFollowerCount from '../../src/utils/token/getFollowerCount';

vi.mock('../../src/utils/token/getFollowerCount', () => ({ default: vi.fn() }));

const getFollowerCountMock = vi.mocked(getFollowerCount);

describe('GET /v1/users/:username/followers/count', () => {
  beforeEach(() => getFollowerCountMock.mockReset());

  it('returns the public count of unique token holders', async () => {
    getFollowerCountMock.mockResolvedValue({
      ok: true,
      user: { id: '507f1f77bcf86cd799439011', username: 'alice' },
      count: 42,
    });

    const response = await request(app).get('/v1/users/Alice/followers/count');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      user: { id: '507f1f77bcf86cd799439011', username: 'alice' },
      followerCount: 42,
    });
    expect(getFollowerCountMock).toHaveBeenCalledWith('alice');
  });

  it('returns 404 for a missing user', async () => {
    getFollowerCountMock.mockResolvedValue({ ok: false, reason: 'user_not_found' });

    const response = await request(app).get('/v1/users/missing_user/followers/count');

    expect(response.status).toBe(404);
    expect(response.body.result.code).toBe('USER_NOT_FOUND');
  });
});
