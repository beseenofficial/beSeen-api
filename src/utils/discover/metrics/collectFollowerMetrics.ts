import type { Types } from 'mongoose';

import UserToken from '../../../models/UserToken';
import TokenHolding from '../../../models/TokenHolding';
import type { DiscoverFollowerMetrics } from '../../../types/discover';

interface FollowerMetricsRecord {
  _id: Types.ObjectId;
  followerCount: number;
  newFollowerCount30d: number;
  lastTokenPurchaseAt: Date;
}

const collectFollowerMetrics = async (
  userIds: Types.ObjectId[],
  activityCutoff: Date,
): Promise<DiscoverFollowerMetrics[]> => {
  const records = await TokenHolding.aggregate<FollowerMetricsRecord>([
    {
      $lookup: {
        from: UserToken.collection.name,
        localField: 'token',
        foreignField: '_id',
        as: 'tokenDocument',
      },
    },
    { $unwind: '$tokenDocument' },
    { $match: { 'tokenDocument.owner': { $in: userIds } } },
    {
      $group: {
        _id: '$tokenDocument.owner',
        followerCount: { $sum: 1 },
        newFollowerCount30d: {
          $sum: { $cond: [{ $gte: ['$createdAt', activityCutoff] }, 1, 0] },
        },
        lastTokenPurchaseAt: { $max: '$createdAt' },
      },
    },
  ]).exec();

  return records.map((record) => ({
    userId: record._id.toString(),
    followerCount: record.followerCount,
    newFollowerCount30d: record.newFollowerCount30d,
    lastTokenPurchaseAt: record.lastTokenPurchaseAt,
  }));
};

export default collectFollowerMetrics;
