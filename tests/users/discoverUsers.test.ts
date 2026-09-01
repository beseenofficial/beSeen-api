import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import discoverUsers from '../../src/utils/user/discoverUsers';
import { encodeDiscoverCursor } from '../../src/utils/discover/discoverCursor';

const user = (
  id: string,
  username: string,
  discoverScore: number,
  avatar: string | null = null,
  bio: string | null = null,
) =>
  new User({
    _id: new Types.ObjectId(id),
    walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
    username,
    avatar,
    bio,
    discoverScore,
  });

const queryResult = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('discoverUsers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a score-ranked public page without private user data', async () => {
    const first = user(
      '000000000000000000000003',
      'third_user',
      80,
      'https://img.example/3.webp',
      'Building private social tools',
    );

    const second = user('000000000000000000000002', 'second_user', 70);

    const extra = user('000000000000000000000001', 'first_user', 60);

    vi.spyOn(User, 'find').mockReturnValue(queryResult([first, second, extra]) as never);

    const result = await discoverUsers({ limit: 2 });

    expect(result).toEqual({
      users: [
        {
          id: first._id.toString(),
          username: 'third_user',
          avatar: 'https://img.example/3.webp',
          bio: 'Building private social tools',
          verification: { isVerified: false, grantedAt: null, expiresAt: null },
        },
        {
          id: second._id.toString(),
          username: 'second_user',
          avatar: null,
          bio: null,
          verification: { isVerified: false, grantedAt: null, expiresAt: null },
        },
      ],
      nextCursor: encodeDiscoverCursor({ score: 70, id: second._id.toString() }),
      hasMore: true,
    });
    expect(User.find).toHaveBeenCalledWith({ status: 'active', deletedAt: null });
    expect(result.users[0]).not.toHaveProperty('walletAddress');
  });

  it('applies the exclusive cursor and returns a final page', async () => {
    const cursor = {
      score: 42.5,
      id: '000000000000000000000010',
    };

    vi.spyOn(User, 'find').mockReturnValue(queryResult([]) as never);

    await expect(discoverUsers({ cursor, limit: 20 })).resolves.toEqual({
      users: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(User.find).toHaveBeenCalledWith({
      status: 'active',
      deletedAt: null,
      $or: [
        { discoverScore: { $lt: cursor.score } },
        {
          discoverScore: cursor.score,
          _id: { $lt: new Types.ObjectId(cursor.id) },
        },
      ],
    });
  });
});
