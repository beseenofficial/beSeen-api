import User from '../models/User';
import { OFFICIAL_USER_USERNAME } from '../constant/user';

const VERIFICATION_DURATION_YEARS = 10;

const verifyOfficialBeseenUser = async () => {
  const grantedAt = new Date();
  const expiresAt = new Date(grantedAt);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + VERIFICATION_DURATION_YEARS);

  const result = await User.collection.updateOne(
    {
      username: OFFICIAL_USER_USERNAME,
      verificationGrantedAt: null,
      verificationExpiresAt: null,
    },
    {
      $set: {
        verificationGrantedAt: grantedAt,
        verificationExpiresAt: expiresAt,
      },
    },
  );

  return {
    matchedUsers: result.matchedCount,
    modifiedUsers: result.modifiedCount,
    username: OFFICIAL_USER_USERNAME,
    grantedAt: result.modifiedCount > 0 ? grantedAt : null,
    expiresAt: result.modifiedCount > 0 ? expiresAt : null,
  };
};

export default verifyOfficialBeseenUser;
