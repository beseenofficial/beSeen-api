import User from '../../models/User';
import type { GetPublicProfileResult } from '../../types/user';

const getPublicProfile = async (username: string): Promise<GetPublicProfileResult> => {
  const user = await User.findOne({ username, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'user_not_found' };
  }

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  };
};

export default getPublicProfile;
