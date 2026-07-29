import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import getPublicProfile from '../../src/utils/user/getPublicProfile';

vi.mock('../../src/utils/user/getPublicProfile', () => ({
  default: vi.fn(),
}));

const getPublicProfileMock = vi.mocked(getPublicProfile);

describe('GET /v1/users/:username', () => {
  beforeEach(() => {
    getPublicProfileMock.mockReset();
  });

  it('normalizes username and returns a public profile without authentication', async () => {
    getPublicProfileMock.mockResolvedValue({
      ok: true,
      user: {
        id: '507f1f77bcf86cd799439011',
        username: 'sample_user',
        avatar: null,
        createdAt: new Date('2026-07-01T12:00:00.000Z'),
      },
    });

    const response = await request(app).get('/v1/users/Sample_User');

    expect(response.status).toBe(200);
    expect(response.body.result.user).not.toHaveProperty('walletAddress');
    expect(response.body.result.user.createdAt).toBe('2026-07-01T12:00:00.000Z');
    expect(response.body.result.user).toMatchObject({
      id: '507f1f77bcf86cd799439011',
      username: 'sample_user',
      avatar: null,
    });
    expect(getPublicProfileMock).toHaveBeenCalledWith('sample_user');
  });

  it('returns stable validation and not-found errors', async () => {
    const invalidResponse = await request(app).get('/v1/users/ab!');
    getPublicProfileMock.mockResolvedValue({ ok: false, reason: 'user_not_found' });
    const missingResponse = await request(app).get('/v1/users/missing_user');

    expect(invalidResponse.status).toBe(400);
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body.result.code).toBe('USER_NOT_FOUND');
  });
});
