import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import discoverUsers from '../../src/utils/user/discoverUsers';

const user = (id: string, username: string, avatar: string | null = null) =>
  new User({
    _id: new Types.ObjectId(id),
    walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
    username,
    avatar,
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

  it('returns a newest-first public page without private user data', async () => {
    const first = user('000000000000000000000003', 'third_user', 'https://img.example/3.webp');

    const second = user('000000000000000000000002', 'second_user');

    const extra = user('000000000000000000000001', 'first_user');

    vi.spyOn(User, 'find').mockReturnValue(queryResult([first, second, extra]) as never);

    const result = await discoverUsers({ limit: 2 });

    expect(result).toEqual({
      users: [
        {
          id: first._id.toString(),
          username: 'third_user',
          avatar: 'https://img.example/3.webp',
        },
        { id: second._id.toString(), username: 'second_user', avatar: null },
      ],
      nextCursor: second._id.toString(),
      hasMore: true,
    });
    expect(User.find).toHaveBeenCalledWith({ status: 'active', deletedAt: null });
    expect(result.users[0]).not.toHaveProperty('walletAddress');
  });

  it('applies the exclusive cursor and returns a final page', async () => {
    const cursor = '000000000000000000000010';

    vi.spyOn(User, 'find').mockReturnValue(queryResult([]) as never);

    await expect(discoverUsers({ cursor, limit: 20 })).resolves.toEqual({
      users: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(User.find).toHaveBeenCalledWith({
      status: 'active',
      deletedAt: null,
      _id: { $lt: new Types.ObjectId(cursor) },
    });
  });
});
