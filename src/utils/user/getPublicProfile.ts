import CreatorProfile from '../../models/CreatorProfile';
import User from '../../models/User';
import type { AuthenticatedCreatorProfile, PublicUserProfile } from '../../types/auth';

type GetPublicProfileResult =
  { ok: true; user: PublicUserProfile } | { ok: false; reason: 'user_not_found' };

const getPublicProfile = async (username: string): Promise<GetPublicProfileResult> => {
  const user = await User.findOne({
    username,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!user) {
    return { ok: false, reason: 'user_not_found' };
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

export default getPublicProfile;
export type { GetPublicProfileResult };
