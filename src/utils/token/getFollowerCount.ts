import User from '../../models/User';
import TokenHolding from '../../models/TokenHolding';
import getOrCreateUserToken from './getOrCreateUserToken';
import type { GetFollowerCountResult } from '../../types/token';

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
