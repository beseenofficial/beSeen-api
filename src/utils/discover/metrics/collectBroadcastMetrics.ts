import type { Types } from 'mongoose';

import Broadcast from '../../../models/Broadcast';
import type { DiscoverBroadcastMetrics } from '../../../types/discover';

interface BroadcastMetricsRecord {
  _id: Types.ObjectId;
  publishedBroadcastCount30d: number;
  lastPublishedBroadcastAt: Date;
}

const collectBroadcastMetrics = async (
  userIds: Types.ObjectId[],
  activityCutoff: Date,
): Promise<DiscoverBroadcastMetrics[]> => {
  const records = await Broadcast.aggregate<BroadcastMetricsRecord>([
    {
      $match: {
        creator: { $in: userIds },
        status: 'published',
      },
    },
    {
      $group: {
        _id: '$creator',
        publishedBroadcastCount30d: {
          $sum: { $cond: [{ $gte: ['$publishedAt', activityCutoff] }, 1, 0] },
        },
        lastPublishedBroadcastAt: { $max: '$publishedAt' },
      },
    },
  ]).exec();

  return records.map((record) => ({
    userId: record._id.toString(),
    publishedBroadcastCount30d: record.publishedBroadcastCount30d,
    lastPublishedBroadcastAt: record.lastPublishedBroadcastAt,
  }));
};

export default collectBroadcastMetrics;
