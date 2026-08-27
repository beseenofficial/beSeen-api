import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import Message from '../../src/models/Message';
import Broadcast from '../../src/models/Broadcast';
import TokenHolding from '../../src/models/TokenHolding';
import MessageBounty from '../../src/models/MessageBounty';
import addDiscoverRanking from '../../src/migrations/20260811AddDiscoverRanking';

describe('20260811AddDiscoverRanking migration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('backfills only missing ranking fields and creates every supporting index', async () => {
    const updateSpy = vi.spyOn(User.collection, 'updateMany').mockResolvedValue({
      matchedCount: 10,
      modifiedCount: 10,
    } as never);

    const userIndexSpy = vi.spyOn(User.collection, 'createIndex').mockResolvedValue('index');

    const holdingIndexSpy = vi
      .spyOn(TokenHolding.collection, 'createIndex')
      .mockResolvedValue('index');

    const messageIndexSpy = vi.spyOn(Message.collection, 'createIndex').mockResolvedValue('index');

    const bountyIndexSpy = vi
      .spyOn(MessageBounty.collection, 'createIndex')
      .mockResolvedValue('index');

    const broadcastIndexSpy = vi
      .spyOn(Broadcast.collection, 'createIndex')
      .mockResolvedValue('index');

    await expect(addDiscoverRanking()).resolves.toEqual({
      matchedUsers: 10,
      modifiedUsers: 10,
      ensuredIndexes: 5,
    });

    expect(updateSpy).toHaveBeenCalledWith(
      {
        $or: [
          { discoverScore: { $exists: false } },
          { discoverScoreVersion: { $exists: false } },
          { discoverScoreUpdatedAt: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            discoverScore: { $ifNull: ['$discoverScore', 0] },
              discoverScoreVersion: { $ifNull: ['$discoverScoreVersion', 3] },
            discoverScoreUpdatedAt: { $ifNull: ['$discoverScoreUpdatedAt', null] },
          },
        },
      ],
    );
    expect(userIndexSpy).toHaveBeenCalledWith(
      { status: 1, discoverScore: -1, _id: -1 },
      { name: 'users_discover_ranking' },
    );
    expect(holdingIndexSpy).toHaveBeenCalledOnce();
    expect(messageIndexSpy).toHaveBeenCalledOnce();
    expect(bountyIndexSpy).toHaveBeenCalledOnce();
    expect(broadcastIndexSpy).toHaveBeenCalledOnce();
  });
});
