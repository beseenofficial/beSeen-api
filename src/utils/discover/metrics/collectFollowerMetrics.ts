import type { Types } from 'mongoose';

import AuraFollow from '../../../models/AuraFollow';
import type { DiscoverFollowerMetrics } from '../../../types/discover';

interface FollowerMetricsRecord {
  _id: Types.ObjectId;
  followerCount: number;
  newFollowerCount30d: number;
  lastAuraPurchaseAt: Date;
}

const collectFollowerMetrics = async (
  userIds: Types.ObjectId[],
  activityCutoff: Date,
): Promise<DiscoverFollowerMetrics[]> => {
  const records = await AuraFollow.aggregate<FollowerMetricsRecord>([
    { $match: { subject: { $in: userIds } } },
    {
      $group: {
        _id: '$subject',
        followerCount: { $sum: 1 },
        newFollowerCount30d: {
          $sum: { $cond: [{ $gte: ['$createdAt', activityCutoff] }, 1, 0] },
        },
        lastAuraPurchaseAt: { $max: '$createdAt' },
      },
    },
  ]).exec();

  return records.map((record) => ({
    userId: record._id.toString(),
    followerCount: record.followerCount,
    newFollowerCount30d: record.newFollowerCount30d,
    lastAuraPurchaseAt: record.lastAuraPurchaseAt,
  }));
};

export default collectFollowerMetrics;
