import User from '../../models/User';
import TokenHolding from '../../models/TokenHolding';
import getOrCreateUserToken from './getOrCreateUserToken';
import type { GetFollowCountsResult } from '../../types/token';

const getFollowCounts = async (username: string): Promise<GetFollowCountsResult> => {
  const user = await User.findOne({ username, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'user_not_found' };
  }

  const token = await getOrCreateUserToken(user._id);

  const [followerCount, followingCount] = await Promise.all([
    TokenHolding.countDocuments({ token: token._id }).exec(),
    TokenHolding.countDocuments({ holder: user._id }).exec(),
  ]);

  return {
    ok: true,
    user: { id: user._id.toString(), username: user.username },
    followerCount,
    followingCount,
  };
};

export default getFollowCounts;
