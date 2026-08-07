import TokenHolding from '../../models/TokenHolding';
import User from '../../models/User';
import getOrCreateUserToken from './getOrCreateUserToken';

type GetFollowerCountResult =
  | { ok: true; user: { id: string; username: string }; count: number }
  | { ok: false; reason: 'user_not_found' };

const getFollowerCount = async (username: string): Promise<GetFollowerCountResult> => {
  const user = await User.findOne({ username, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'user_not_found' };
  }

  const token = await getOrCreateUserToken(user._id);
  const count = await TokenHolding.countDocuments({ token: token._id }).exec();

  return {
    ok: true,
    user: { id: user._id.toString(), username: user.username },
    count,
  };
};

export default getFollowerCount;
export type { GetFollowerCountResult };
