import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import Message from '../../src/models/Message';
import Broadcast from '../../src/models/Broadcast';
import MessageBounty from '../../src/models/MessageBounty';
import getPublicProfile from '../../src/utils/user/getPublicProfile';

const queryResult = (value: unknown) => ({
  exec: vi.fn().mockResolvedValue(value),
});

describe('getPublicProfile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns published broadcast and sent, received, and total message counts', async () => {
    const userId = new Types.ObjectId();
    const createdAt = new Date('2026-07-01T12:00:00.000Z');
    const user = new User({
      _id: userId,
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      username: 'alice',
      createdAt,
    });

    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(user) as never);
    const broadcastCountSpy = vi
      .spyOn(Broadcast, 'countDocuments')
      .mockReturnValue(queryResult(9) as never);
    const messageCountSpy = vi
      .spyOn(Message, 'countDocuments')
      .mockReturnValueOnce(queryResult(12) as never)
      .mockReturnValueOnce(queryResult(8) as never);
    const bountyAggregateSpy = vi
      .spyOn(MessageBounty, 'aggregate')
      .mockReturnValue(queryResult([{ total: '35.5' }]) as never);

    await expect(getPublicProfile('alice')).resolves.toEqual({
      ok: true,
      user: {
        id: userId.toString(),
        username: 'alice',
        avatar: null,
        bio: null,
        verification: { isVerified: false, grantedAt: null, expiresAt: null },
        broadcastCount: 9,
        sentMessageCount: 12,
        receivedMessageCount: 8,
        messageCount: 20,
        totalBountyReceivedUsdc: '35.5',
        createdAt,
      },
    });
    expect(broadcastCountSpy).toHaveBeenCalledWith({ creator: userId, status: 'published' });
    expect(messageCountSpy).toHaveBeenNthCalledWith(1, { sender: userId });
    expect(messageCountSpy).toHaveBeenNthCalledWith(2, { recipient: userId });
    expect(bountyAggregateSpy).toHaveBeenCalledWith([
      {
        $match: {
          beneficiary: userId,
          status: 'claimed',
          assetCode: 'USDC',
        },
      },
      { $group: { _id: null, total: { $sum: { $toDecimal: '$amount' } } } },
      { $project: { _id: 0, total: { $toString: '$total' } } },
    ]);
  });

  it('does not query broadcasts when the user is unavailable', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(null) as never);
    const broadcastCountSpy = vi.spyOn(Broadcast, 'countDocuments');
    const messageCountSpy = vi.spyOn(Message, 'countDocuments');
    const bountyAggregateSpy = vi.spyOn(MessageBounty, 'aggregate');

    await expect(getPublicProfile('missing_user')).resolves.toEqual({
      ok: false,
      reason: 'user_not_found',
    });
    expect(broadcastCountSpy).not.toHaveBeenCalled();
    expect(messageCountSpy).not.toHaveBeenCalled();
    expect(bountyAggregateSpy).not.toHaveBeenCalled();
  });
});
