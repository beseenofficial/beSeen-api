import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MessageBounty from '../../src/models/MessageBounty';
import getAvailableBountySummary from '../../src/utils/messenger/getAvailableBountySummary';

const userId = new Types.ObjectId('000000000000000000000001');
const now = new Date('2026-09-19T12:00:00.000Z');

const mockAggregation = (records: { unclaimedCount: number }[]) => {
  const exec = vi.fn().mockResolvedValue(records);
  const aggregate = vi.spyOn(MessageBounty, 'aggregate').mockReturnValue({ exec } as never);
  return aggregate;
};

describe('getAvailableBountySummary', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('counts unique offered and claimable incoming bounties in the database', async () => {
    const aggregate = mockAggregation([{ unclaimedCount: 2 }]);

    await expect(getAvailableBountySummary(userId.toString(), now)).resolves.toEqual({
      unclaimedCount: 2,
      updatedAt: now,
    });

    const pipeline = aggregate.mock.calls[0]?.[0];
    expect(pipeline).toEqual([
      {
        $match: {
          beneficiary: userId,
          sponsor: { $ne: userId },
          status: { $in: ['offered', 'claimable'] },
          fundingStatus: 'contract_locked',
          expiresAt: { $gt: now },
        },
      },
      { $group: { _id: '$contractBountyId' } },
      { $count: 'unclaimedCount' },
    ]);
  });

  it('excludes claimed, expired, refunded, and cancelled effective states', async () => {
    const aggregate = mockAggregation([]);

    await getAvailableBountySummary(userId.toString(), now);

    const match = aggregate.mock.calls[0]?.[0]?.[0]?.$match;
    expect(match).toMatchObject({
      status: { $in: ['offered', 'claimable'] },
      fundingStatus: 'contract_locked',
    });
    expect(match?.status.$in).not.toEqual(
      expect.arrayContaining(['claimed', 'expired', 'refunded', 'cancelled']),
    );
  });

  it('excludes outgoing bounties and derives the recipient from the supplied authenticated user', async () => {
    const aggregate = mockAggregation([]);

    await getAvailableBountySummary(userId.toString(), now);

    const match = aggregate.mock.calls[0]?.[0]?.[0]?.$match;
    expect(match?.beneficiary).toEqual(userId);
    expect(match?.sponsor).toEqual({ $ne: userId });
  });

  it('excludes stale active records whose expiration equals or precedes server time', async () => {
    const aggregate = mockAggregation([]);

    await getAvailableBountySummary(userId.toString(), now);

    const match = aggregate.mock.calls[0]?.[0]?.[0]?.$match;
    expect(match?.expiresAt).toEqual({ $gt: now });
  });

  it('deduplicates multiple records for one contract bounty before counting', async () => {
    const aggregate = mockAggregation([{ unclaimedCount: 1 }]);

    await expect(getAvailableBountySummary(userId.toString(), now)).resolves.toMatchObject({
      unclaimedCount: 1,
    });

    expect(aggregate.mock.calls[0]?.[0]).toContainEqual({
      $group: { _id: '$contractBountyId' },
    });
  });

  it('returns zero when the authenticated user has no available bounties', async () => {
    mockAggregation([]);

    await expect(getAvailableBountySummary(userId.toString(), now)).resolves.toEqual({
      unclaimedCount: 0,
      updatedAt: now,
    });
  });
});
