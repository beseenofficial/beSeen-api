import User from '../../models/User';
import AuraFollow from '../../models/AuraFollow';
import type { GetFollowCountsResult } from '../../types/follow';

const getFollowCounts = async (username: string): Promise<GetFollowCountsResult> => {
  const user = await User.findOne({ username, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'user_not_found' };
  }

  const [followerCount, followingCount] = await Promise.all([
    AuraFollow.countDocuments({ subject: user._id }).exec(),
    AuraFollow.countDocuments({ follower: user._id }).exec(),
  ]);
  return {
    ok: true,
    user: { id: user._id.toString(), username: user.username },
    followerCount,
    followingCount,
  };
};

export default getFollowCounts;
