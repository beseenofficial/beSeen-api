import User from '../models/User';

const addUserVerification = async () => {
  const backfillResult = await User.collection.updateMany(
    {
      $or: [
        { verificationGrantedAt: { $exists: false } },
        { verificationExpiresAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          verificationGrantedAt: { $ifNull: ['$verificationGrantedAt', null] },
          verificationExpiresAt: { $ifNull: ['$verificationExpiresAt', null] },
        },
      },
    ],
  );

  return {
    matchedUsers: backfillResult.matchedCount,
    modifiedUsers: backfillResult.modifiedCount,
  };
};

export default addUserVerification;
