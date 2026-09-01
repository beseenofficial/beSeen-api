import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import discoverUsers from '../../src/utils/user/discoverUsers';
import { encodeDiscoverCursor } from '../../src/utils/discover/discoverCursor';

vi.mock('../../src/utils/user/discoverUsers', () => ({ default: vi.fn() }));

const discoverUsersMock = vi.mocked(discoverUsers);

describe('GET /v1/users/discover', () => {
  beforeEach(() => {
    discoverUsersMock.mockReset();
  });

  it('returns a public user page without authentication', async () => {
    discoverUsersMock.mockResolvedValue({
      users: [
        {
          id: '507f1f77bcf86cd799439011',
          username: 'sample_user',
          avatar: null,
          bio: 'Building private social tools',
          verification: { isVerified: false, grantedAt: null, expiresAt: null },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const response = await request(app).get('/v1/users/discover?limit=10');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      users: [
        {
          id: '507f1f77bcf86cd799439011',
          username: 'sample_user',
          avatar: null,
          bio: 'Building private social tools',
          verification: { isVerified: false, grantedAt: null, expiresAt: null },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    expect(discoverUsersMock).toHaveBeenCalledWith({ limit: 10 });
  });

  it('rejects invalid pagination without calling the utility', async () => {
    const response = await request(app).get('/v1/users/discover?limit=0&cursor=invalid');

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(discoverUsersMock).not.toHaveBeenCalled();
  });

  it('decodes an opaque ranking cursor for the Discover utility', async () => {
    const cursor = {
      score: 73.42,
      id: '507f1f77bcf86cd799439011',
    };

    discoverUsersMock.mockResolvedValue({
      users: [],
      nextCursor: null,
      hasMore: false,
    });

    const response = await request(app).get(
      `/v1/users/discover?limit=20&cursor=${encodeURIComponent(encodeDiscoverCursor(cursor))}`,
    );

    expect(response.status).toBe(200);
    expect(discoverUsersMock).toHaveBeenCalledWith({ limit: 20, cursor });
  });
});
