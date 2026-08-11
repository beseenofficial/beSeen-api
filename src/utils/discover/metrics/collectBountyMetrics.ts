import type { Types } from 'mongoose';

import MessageBounty from '../../../models/MessageBounty';
import type { DiscoverBountyMetrics } from '../../../types/discover';
import { DISCOVER_BOUNTY_AMOUNT_ASSET_CODE } from '../../../constant/discover';

interface BountyMetricsRecord {
  _id: Types.ObjectId;
  claimedBountyCount: number;
  claimedUsdcAmount: number;
}

const collectBountyMetrics = async (
  userIds: Types.ObjectId[],
): Promise<DiscoverBountyMetrics[]> => {
  const records = await MessageBounty.aggregate<BountyMetricsRecord>([
    {
      $match: {
        status: 'claimed',
        beneficiary: { $in: userIds },
      },
    },
    {
      $group: {
        _id: '$beneficiary',
        claimedBountyCount: { $sum: 1 },
        claimedUsdcAmount: {
          $sum: {
            $cond: [
              { $eq: ['$assetCode', DISCOVER_BOUNTY_AMOUNT_ASSET_CODE] },
              {
                $convert: {
                  input: '$amount',
                  to: 'double',
                  onError: 0,
                  onNull: 0,
                },
              },
              0,
            ],
          },
        },
      },
    },
  ]).exec();

  return records.map((record) => ({
    userId: record._id.toString(),
    claimedBountyCount: record.claimedBountyCount,
    claimedUsdcAmount: record.claimedUsdcAmount,
  }));
};

export default collectBountyMetrics;
