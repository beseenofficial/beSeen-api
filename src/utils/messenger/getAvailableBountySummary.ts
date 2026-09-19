import { Types } from 'mongoose';

import MessageBounty from '../../models/MessageBounty';
import type { AvailableBountySummary } from '../../types/messenger/bounty';

interface AvailableBountyCountRecord {
  unclaimedCount: number;
}

const getAvailableBountySummary = async (
  userId: string,
  now = new Date(),
): Promise<AvailableBountySummary> => {
  const authenticatedUserId = new Types.ObjectId(userId);

  const [record] = await MessageBounty.aggregate<AvailableBountyCountRecord>([
    {
      $match: {
        beneficiary: authenticatedUserId,
        sponsor: { $ne: authenticatedUserId },
        status: { $in: ['offered', 'claimable'] },
        fundingStatus: 'contract_locked',
        expiresAt: { $gt: now },
      },
    },
    // The current schema keeps lifecycle state on one canonical bounty document.
    // Grouping still protects the dashboard count from duplicate legacy records.
    { $group: { _id: '$contractBountyId' } },
    { $count: 'unclaimedCount' },
  ]).exec();

  return {
    unclaimedCount: record?.unclaimedCount ?? 0,
    updatedAt: now,
  };
};

export default getAvailableBountySummary;
