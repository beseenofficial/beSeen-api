import type { ClientSession } from 'mongoose';

import { withDatabaseTransaction } from '../../db';
import CreatorProfile from '../../models/CreatorProfile';
import User from '../../models/User';
import type { AuthenticatedCreatorProfile, AuthenticatedUser } from '../../types/auth';
import type { UpdateProfileBody } from '../../validation/user/updateProfile';

type UpdateProfileFailureReason =
  | 'account_unavailable'
  | 'username_taken'
  | 'creator_profile_not_allowed'
  | 'creator_profile_required';

type UpdateCurrentUserResult =
  { ok: true; user: AuthenticatedUser } | { ok: false; reason: UpdateProfileFailureReason };

interface MongoDuplicateKeyError extends Error {
  code: number;
  keyPattern?: Record<string, number>;
}

const isUsernameDuplicateError = (error: unknown): error is MongoDuplicateKeyError =>
  error instanceof Error &&
  'code' in error &&
  error.code === 11_000 &&
  'keyPattern' in error &&
  typeof error.keyPattern === 'object' &&
  error.keyPattern !== null &&
  'username' in error.keyPattern;

const updateCurrentUserInTransaction = async (
  userId: string,
  body: UpdateProfileBody,
  session: ClientSession,
): Promise<UpdateCurrentUserResult> => {
  const user = await User.findOne({
    _id: userId,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  if (body.username && body.username !== user.username) {
    const usernameOwner = await User.exists({ username: body.username, _id: { $ne: user._id } })
      .session(session)
      .exec();

    if (usernameOwner) {
      return { ok: false, reason: 'username_taken' };
    }
  }

  const nextAccountType = body.accountType ?? user.accountType;

  if (user.accountType === 'regular' && nextAccountType === 'regular' && body.creatorProfile) {
    return { ok: false, reason: 'creator_profile_not_allowed' };
  }

  let creatorProfileResult: AuthenticatedCreatorProfile | null = null;

  if (nextAccountType === 'creator') {
    if (user.accountType === 'regular') {
      const creatorInput = body.creatorProfile;

      if (!creatorInput?.headline || !creatorInput.categories) {
        return { ok: false, reason: 'creator_profile_required' };
      }

      const creatorProfile = new CreatorProfile({ user: user._id, ...creatorInput });
      await creatorProfile.save({ session });
      creatorProfileResult = {
        headline: creatorProfile.headline,
        categories: creatorProfile.categories,
        skills: creatorProfile.skills,
        websiteUrl: creatorProfile.websiteUrl,
        isAvailableForWork: creatorProfile.isAvailableForWork,
      };
    } else {
      const creatorProfile = await CreatorProfile.findOne({ user: user._id })
        .session(session)
        .exec();

      if (!creatorProfile) {
        throw new Error('Creator account is missing its creator profile');
      }

      const creatorInput = body.creatorProfile;

      if (creatorInput) {
        if (creatorInput.headline !== undefined) creatorProfile.headline = creatorInput.headline;
        if (creatorInput.categories !== undefined)
          creatorProfile.categories = creatorInput.categories;
        if (creatorInput.skills !== undefined) creatorProfile.skills = creatorInput.skills;
        if (creatorInput.websiteUrl !== undefined)
          creatorProfile.websiteUrl = creatorInput.websiteUrl;
        if (creatorInput.isAvailableForWork !== undefined)
          creatorProfile.isAvailableForWork = creatorInput.isAvailableForWork;
        await creatorProfile.save({ session });
      }

      creatorProfileResult = {
        headline: creatorProfile.headline,
        categories: creatorProfile.categories,
        skills: creatorProfile.skills,
        websiteUrl: creatorProfile.websiteUrl,
        isAvailableForWork: creatorProfile.isAvailableForWork,
      };
    }
  } else if (user.accountType === 'creator') {
    await CreatorProfile.deleteOne({ user: user._id }).session(session).exec();
  }

  if (body.username !== undefined) user.username = body.username;
  if (body.displayName !== undefined) user.displayName = body.displayName;
  if (body.bio !== undefined) user.bio = body.bio;
  if (body.avatarUrl !== undefined) user.avatarUrl = body.avatarUrl;
  user.accountType = nextAccountType;
  await user.save({ session });

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

const updateCurrentUser = async (
  userId: string,
  body: UpdateProfileBody,
): Promise<UpdateCurrentUserResult> => {
  try {
    return await withDatabaseTransaction((session) =>
      updateCurrentUserInTransaction(userId, body, session),
    );
  } catch (error: unknown) {
    if (isUsernameDuplicateError(error)) {
      return { ok: false, reason: 'username_taken' };
    }

    throw error;
  }
};

export default updateCurrentUser;
export type { UpdateCurrentUserResult, UpdateProfileFailureReason };
