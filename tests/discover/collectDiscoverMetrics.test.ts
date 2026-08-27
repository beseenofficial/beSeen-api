import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Message from '../../src/models/Message';
import Broadcast from '../../src/models/Broadcast';
import TokenHolding from '../../src/models/TokenHolding';
import MessageBounty from '../../src/models/MessageBounty';
import UserActivityDay from '../../src/models/UserActivityDay';
import collectDiscoverMetrics from '../../src/utils/discover/collectDiscoverMetrics';

const aggregateResult = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('collectDiscoverMetrics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('combines grouped activity while keeping defaults for missing metrics', async () => {
    const userId = new Types.ObjectId('000000000000000000000001');

    const registeredAt = new Date('2026-07-01T12:00:00.000Z');

    const activityAt = new Date('2026-08-10T12:00:00.000Z');

    vi.spyOn(TokenHolding, 'aggregate').mockReturnValue(
      aggregateResult([
        {
          _id: userId,
          followerCount: 20,
          newFollowerCount30d: 5,
          lastTokenPurchaseAt: activityAt,
        },
      ]) as never,
    );
    vi.spyOn(MessageBounty, 'aggregate').mockReturnValue(
      aggregateResult([
        {
          _id: userId,
          claimedBountyCount: 3,
          claimedUsdcAmount: 25,
        },
      ]) as never,
    );
    vi.spyOn(Message, 'aggregate').mockReturnValue(
      aggregateResult([
        {
          _id: userId,
          reciprocalConversationCount30d: 4,
          lastReciprocalChatAt: activityAt,
        },
      ]) as never,
    );
    vi.spyOn(Broadcast, 'aggregate').mockReturnValue(
      aggregateResult([
        {
          _id: userId,
          publishedBroadcastCount30d: 2,
          lastPublishedBroadcastAt: activityAt,
        },
      ]) as never,
    );
    vi.spyOn(UserActivityDay, 'aggregate').mockReturnValue(
      aggregateResult([{ _id: userId, activeSeconds30d: 3_600, activeDays30d: 2 }]) as never,
    );

    const result = await collectDiscoverMetrics(
      [{ id: userId.toString(), registeredAt, hasAvatar: true, lastActiveAt: activityAt }],
      [userId],
      new Date('2026-08-11T12:00:00.000Z'),
    );

    expect(result.get(userId.toString())).toEqual({
      hasAvatar: true,
      activeSeconds30d: 3_600,
      activeDays30d: 2,
      lastActiveAt: activityAt,
      followerCount: 20,
      newFollowerCount30d: 5,
      lastTokenPurchaseAt: activityAt,
      claimedBountyCount: 3,
      claimedUsdcAmount: 25,
      reciprocalConversationCount30d: 4,
      lastReciprocalChatAt: activityAt,
      publishedBroadcastCount30d: 2,
      lastPublishedBroadcastAt: activityAt,
      registeredAt,
    });

    const chatPipeline = vi.mocked(Message.aggregate).mock.calls[0]?.[0];

    const bountyPipeline = vi.mocked(MessageBounty.aggregate).mock.calls[0]?.[0];

    const broadcastPipeline = vi.mocked(Broadcast.aggregate).mock.calls[0]?.[0];

    expect(chatPipeline).toEqual(
      expect.arrayContaining([
        { $match: { 'senders.1': { $exists: true } } },
        { $unwind: '$senders' },
      ]),
    );
    expect(bountyPipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({ status: 'claimed' }),
        }),
      ]),
    );
    expect(JSON.stringify(bountyPipeline)).toContain('USDC');
    expect(broadcastPipeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          $match: expect.objectContaining({ status: 'published' }),
        }),
      ]),
    );
  });

  it('does not query activity collections when there are no active users', async () => {
    const holdingAggregateSpy = vi.spyOn(TokenHolding, 'aggregate');

    const messageAggregateSpy = vi.spyOn(Message, 'aggregate');
    const activityAggregateSpy = vi.spyOn(UserActivityDay, 'aggregate');

    const result = await collectDiscoverMetrics([], [], new Date());

    expect(result.size).toBe(0);
    expect(holdingAggregateSpy).not.toHaveBeenCalled();
    expect(messageAggregateSpy).not.toHaveBeenCalled();
    expect(activityAggregateSpy).not.toHaveBeenCalled();
  });
});
