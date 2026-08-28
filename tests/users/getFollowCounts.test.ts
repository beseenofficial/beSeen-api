import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import TokenHolding from '../../src/models/TokenHolding';
import getFollowCounts from '../../src/utils/token/getFollowCounts';
import getOrCreateUserToken from '../../src/utils/token/getOrCreateUserToken';

vi.mock('../../src/utils/token/getOrCreateUserToken', () => ({ default: vi.fn() }));

const queryResult = (value: unknown) => ({
  exec: vi.fn().mockResolvedValue(value),
});

describe('getFollowCounts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(getOrCreateUserToken).mockReset();
  });

  it('counts holders of the user token and tokens held by the user', async () => {
    const userId = new Types.ObjectId();
    const tokenId = new Types.ObjectId();
    const user = new User({
      _id: userId,
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      username: 'alice',
    });

    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    vi.mocked(getOrCreateUserToken).mockResolvedValue({ _id: tokenId } as never);

    const countSpy = vi
      .spyOn(TokenHolding, 'countDocuments')
      .mockReturnValueOnce(queryResult(12) as never)
      .mockReturnValueOnce(queryResult(7) as never);

    await expect(getFollowCounts('alice')).resolves.toEqual({
      ok: true,
      user: { id: userId.toString(), username: 'alice' },
      followerCount: 12,
      followingCount: 7,
    });
    expect(countSpy).toHaveBeenNthCalledWith(1, { token: tokenId });
    expect(countSpy).toHaveBeenNthCalledWith(2, { holder: userId });
  });

  it('returns not found without counting holdings for an unavailable user', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(null) as never);
    const countSpy = vi.spyOn(TokenHolding, 'countDocuments');

    await expect(getFollowCounts('missing_user')).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
    expect(getOrCreateUserToken).not.toHaveBeenCalled();
    expect(countSpy).not.toHaveBeenCalled();
  });
});
