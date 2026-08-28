import User from '../../models/User';
import getUserVerification from './getUserVerification';
import type { GetCurrentUserResult } from '../../types/user';

const getCurrentUser = async (userId: string): Promise<GetCurrentUserResult> => {
  const user = await User.findOne({ _id: userId, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      verification: getUserVerification(user),
      createdAt: user.createdAt,
    },
  };
};

export default getCurrentUser;
