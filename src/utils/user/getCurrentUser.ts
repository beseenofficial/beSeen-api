import CreatorProfile from '../../models/CreatorProfile';
import User from '../../models/User';
import type { AuthenticatedCreatorProfile, AuthenticatedUser } from '../../types/auth';

type GetCurrentUserResult =
  { ok: true; user: AuthenticatedUser } | { ok: false; reason: 'account_unavailable' };

const getCurrentUser = async (userId: string): Promise<GetCurrentUserResult> => {
  const user = await User.findOne({
    _id: userId,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  let creatorProfileResult: AuthenticatedCreatorProfile | null = null;

  if (user.accountType === 'creator') {
    const creatorProfile = await CreatorProfile.findOne({ user: user._id }).exec();

    if (!creatorProfile) {
      throw new Error('Creator account is missing its creator profile');
    }

    creatorProfileResult = {
      headline: creatorProfile.headline,
      categories: creatorProfile.categories,
      skills: creatorProfile.skills,
      websiteUrl: creatorProfile.websiteUrl,
      isAvailableForWork: creatorProfile.isAvailableForWork,
    };
  }

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      walletAddress: user.walletAddress,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      accountType: user.accountType,
      creatorProfile: creatorProfileResult,
      createdAt: user.createdAt,
    },
  };
};

export default getCurrentUser;
export type { GetCurrentUserResult };
