import User from '../../models/User';
import getUserVerification from './getUserVerification';
import type { GetCurrentUserResult } from '../../types/user';
import getContractAuraPrices from '../contract/getContractAuraPrices';

const getCurrentUser = async (userId: string): Promise<GetCurrentUserResult> => {
  const user = await User.findOne({ _id: userId, status: 'active', deletedAt: null }).exec();
  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const auraPriceByWalletAddress = await getContractAuraPrices([user.walletAddress]);

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      auraPrice: auraPriceByWalletAddress.get(user.walletAddress) ?? null,
      verification: getUserVerification(user),
      createdAt: user.createdAt,
    },
  };
};

export default getCurrentUser;
