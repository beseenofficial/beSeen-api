import User from '../../models/User';
import type { AuthenticatedUser } from '../../types/auth';

type GetCurrentUserResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: 'account_unavailable' };

const getCurrentUser = async (userId: string): Promise<GetCurrentUserResult> => {
  const user = await User.findOne({ _id: userId, status: 'active', deletedAt: null }).exec();
  if (!user) return { ok: false, reason: 'account_unavailable' };

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

export default getCurrentUser;
export type { GetCurrentUserResult };
