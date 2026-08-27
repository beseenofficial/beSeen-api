import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import type { DiscoverRankingMetrics } from '../../src/types/discover';
import collectDiscoverMetrics from '../../src/utils/discover/collectDiscoverMetrics';
import recalculateDiscoverRankings from '../../src/utils/discover/recalculateDiscoverRankings';

vi.mock('../../src/utils/discover/collectDiscoverMetrics', () => ({ default: vi.fn() }));

const collectDiscoverMetricsMock = vi.mocked(collectDiscoverMetrics);

const userQueryResult = (value: unknown) => ({
  select: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('recalculateDiscoverRankings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    collectDiscoverMetricsMock.mockReset();
  });

  it('calculates and stores versioned scores for every active user', async () => {
    const userId = new Types.ObjectId('000000000000000000000001');

    const registeredAt = new Date('2026-07-01T12:00:00.000Z');

    const calculatedAt = new Date('2026-08-11T12:00:00.000Z');

    const user = new User({
      _id: userId,
      walletAddress: 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR',
      username: 'ranked_user',
      createdAt: registeredAt,
    });

    const metrics: DiscoverRankingMetrics = {
      hasAvatar: false,
      activeSeconds30d: 0,
      activeDays30d: 0,
      lastActiveAt: null,
      followerCount: 1_000,
      newFollowerCount30d: 0,
      lastTokenPurchaseAt: null,
      claimedBountyCount: 0,
      claimedUsdcAmount: 0,
      reciprocalConversationCount30d: 0,
      lastReciprocalChatAt: null,
      publishedBroadcastCount30d: 0,
      lastPublishedBroadcastAt: null,
      registeredAt,
    };

    vi.spyOn(User, 'find').mockReturnValue(userQueryResult([user]) as never);
    collectDiscoverMetricsMock.mockResolvedValue(new Map([[userId.toString(), metrics]]));

    const bulkWriteSpy = vi.spyOn(User, 'bulkWrite').mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    } as never);

    const result = await recalculateDiscoverRankings(calculatedAt);

    expect(result).toMatchObject({
      processedUsers: 1,
      matchedUsers: 1,
      modifiedUsers: 1,
      calculatedAt,
    });
    expect(bulkWriteSpy).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { _id: userId, status: 'active', deletedAt: null },
            update: {
              $set: {
                discoverScore: 30,
                discoverScoreVersion: 3,
                discoverScoreUpdatedAt: calculatedAt,
              },
            },
          },
        },
      ],
      { ordered: false },
    );
  });

  it('does not execute an empty bulk write', async () => {
    vi.spyOn(User, 'find').mockReturnValue(userQueryResult([]) as never);
    collectDiscoverMetricsMock.mockResolvedValue(new Map());

    const bulkWriteSpy = vi.spyOn(User, 'bulkWrite');

    await expect(recalculateDiscoverRankings()).resolves.toMatchObject({
      processedUsers: 0,
      matchedUsers: 0,
      modifiedUsers: 0,
    });
    expect(bulkWriteSpy).not.toHaveBeenCalled();
  });
});
