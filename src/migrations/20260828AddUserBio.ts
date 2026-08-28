import User from '../models/User';

const addUserBio = async () => {
  const backfillResult = await User.collection.updateMany(
    { bio: { $exists: false } },
    { $set: { bio: null } },
  );

  return {
    matchedUsers: backfillResult.matchedCount,
    modifiedUsers: backfillResult.modifiedCount,
  };
};

export default addUserBio;
