import User from '../models/User';
import UserActivityDay from '../models/UserActivityDay';

const addUserActivity = async () => {
  const backfillResult = await User.collection.updateMany(
    {
      $or: [
        { lastActiveAt: { $exists: false } },
        { lastActivityHeartbeatAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          lastActiveAt: { $ifNull: ['$lastActiveAt', null] },
          lastActivityHeartbeatAt: { $ifNull: ['$lastActivityHeartbeatAt', null] },
        },
      },
    ],
  );

  await Promise.all([
    UserActivityDay.collection.createIndex(
      { user: 1, day: 1 },
      { unique: true, name: 'user_activity_days_user_day_unique' },
    ),
    UserActivityDay.collection.createIndex(
      { day: 1 },
      { name: 'user_activity_days_recent' },
    ),
  ]);

  return {
    matchedUsers: backfillResult.matchedCount,
    modifiedUsers: backfillResult.modifiedCount,
    ensuredIndexes: 2,
  };
};

export default addUserActivity;
