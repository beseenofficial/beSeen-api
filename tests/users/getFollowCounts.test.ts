import { Types } from 'mongoose';
import User from '../../src/models/User';
import AuraFollow from '../../src/models/AuraFollow';
import { afterEach, describe, expect, it, vi } from 'vitest';
import getFollowCounts from '../../src/utils/aura/getFollowCounts';

const queryResult = (value: unknown) => ({
  exec: vi.fn().mockResolvedValue(value),
});

describe('getFollowCounts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('counts confirmed Aura follow relationships in both directions', async () => {
    const userId = new Types.ObjectId();

    const user = new User({
      _id: userId,
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      username: 'alice',
    });

    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    const countSpy = vi
      .spyOn(AuraFollow, 'countDocuments')
      .mockReturnValueOnce(queryResult(12) as never)
      .mockReturnValueOnce(queryResult(7) as never);

    await expect(getFollowCounts('alice')).resolves.toEqual({
      ok: true,
      user: { id: userId.toString(), username: 'alice' },
      followerCount: 12,
      followingCount: 7,
    });
    expect(countSpy).toHaveBeenNthCalledWith(1, { subject: userId });
    expect(countSpy).toHaveBeenNthCalledWith(2, { follower: userId });
  });

  it('returns not found without counting holdings for an unavailable user', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(null) as never);
    const countSpy = vi.spyOn(AuraFollow, 'countDocuments');

    await expect(getFollowCounts('missing_user')).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
    expect(countSpy).not.toHaveBeenCalled();
  });
});
