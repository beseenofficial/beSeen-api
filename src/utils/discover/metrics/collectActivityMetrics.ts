import type { Types } from 'mongoose';

import UserActivityDay from '../../../models/UserActivityDay';
import type { DiscoverActivityMetrics } from '../../../types/discover';

interface ActivityMetricsRecord {
  _id: Types.ObjectId;
  activeSeconds30d: number;
  activeDays30d: number;
}

const collectActivityMetrics = async (
  userIds: Types.ObjectId[],
  activityCutoff: Date,
): Promise<DiscoverActivityMetrics[]> => {
  const cutoffDay = new Date(Date.UTC(
    activityCutoff.getUTCFullYear(),
    activityCutoff.getUTCMonth(),
    activityCutoff.getUTCDate(),
  ));
  const records = await UserActivityDay.aggregate<ActivityMetricsRecord>([
    { $match: { user: { $in: userIds }, day: { $gte: cutoffDay } } },
    {
      $group: {
        _id: '$user',
        activeSeconds30d: { $sum: '$activeSeconds' },
        activeDays30d: { $sum: { $cond: [{ $gt: ['$activeSeconds', 0] }, 1, 0] } },
      },
    },
  ]).exec();

  return records.map((record) => ({
    userId: record._id.toString(),
    activeSeconds30d: record.activeSeconds30d,
    activeDays30d: record.activeDays30d,
  }));
};

export default collectActivityMetrics;
