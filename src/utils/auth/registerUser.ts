import type { ClientSession } from 'mongoose';

import { withDatabaseTransaction } from '../../db';
import AuthChallenge from '../../models/AuthChallenge';
import CreatorProfile from '../../models/CreatorProfile';
import User from '../../models/User';
import UserKey from '../../models/UserKey';
import type { RegisterBody } from '../../validation/auth/register';
import { hashRegistrationToken } from './registrationToken';

type RegistrationFailureReason =
  | 'registration_token_invalid'
  | 'username_taken'
  | 'wallet_already_registered'
  | 'public_key_already_registered';

interface RegisteredCreatorProfile {
  headline: string;
  categories: string[];
  skills: string[];
  websiteUrl: string | null;
  isAvailableForWork: boolean;
}

interface RegisteredUser {
  id: string;
  walletAddress: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  accountType: 'regular' | 'creator';
  creatorProfile: RegisteredCreatorProfile | null;
  createdAt: Date;
}

interface SuccessfulRegistration {
  ok: true;
  user: RegisteredUser;
}

interface RejectedRegistration {
  ok: false;
  reason: RegistrationFailureReason;
}

type RegisterUserResult = SuccessfulRegistration | RejectedRegistration;

interface MongoDuplicateKeyError extends Error {
  code: number;
  keyPattern?: Record<string, number>;
}

const isMongoDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError => {
  return error instanceof Error && 'code' in error && error.code === 11_000;
};

const duplicateKeyReason = (error: MongoDuplicateKeyError): RegistrationFailureReason => {
  const keyPattern = error.keyPattern ?? {};

  if ('username' in keyPattern) {
    return 'username_taken';
  }

  if ('walletAddress' in keyPattern || 'user' in keyPattern) {
    return 'wallet_already_registered';
  }

  return 'public_key_already_registered';
};

const registerUserInTransaction = async (
  body: RegisterBody,
  session: ClientSession,
): Promise<RegisterUserResult> => {
  const now = new Date();
  const registrationTokenHash = hashRegistrationToken(body.registrationToken);
  const challenge = await AuthChallenge.findOne({
    purpose: 'registration',
    registrationTokenHash,
    registrationTokenExpiresAt: { $gt: now },
    registrationTokenUsedAt: null,
    usedAt: { $ne: null },
  })
    .select('+registrationTokenHash')
    .session(session)
    .exec();

  if (
    !challenge ||
    !challenge.signingPublicKey ||
    !challenge.encryptionPublicKey ||
    !challenge.derivationVersion
  ) {
    return { ok: false, reason: 'registration_token_invalid' };
  }

  const existingWallet = await User.exists({ walletAddress: challenge.walletAddress })
    .session(session)
    .exec();

  if (existingWallet) {
    return { ok: false, reason: 'wallet_already_registered' };
  }

  const existingUsername = await User.exists({ username: body.profile.username })
    .session(session)
    .exec();

  if (existingUsername) {
    return { ok: false, reason: 'username_taken' };
  }

  const existingPublicKey = await UserKey.exists({
    $or: [
      { signingPublicKey: challenge.signingPublicKey },
      { encryptionPublicKey: challenge.encryptionPublicKey },
    ],
  })
    .session(session)
    .exec();

  if (existingPublicKey) {
    return { ok: false, reason: 'public_key_already_registered' };
  }

  const consumedChallenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      registrationTokenHash,
      registrationTokenExpiresAt: { $gt: now },
      registrationTokenUsedAt: null,
    },
    { $set: { registrationTokenUsedAt: now } },
    { new: true, session },
  ).exec();

  if (!consumedChallenge) {
    return { ok: false, reason: 'registration_token_invalid' };
  }

  const user = new User({
    walletAddress: challenge.walletAddress,
    username: body.profile.username,
    displayName: body.profile.displayName,
    bio: body.profile.bio,
    avatarUrl: body.profile.avatarUrl,
    accountType: body.profile.accountType,
  });
  await user.save({ session });

  const userKey = new UserKey({
    user: user._id,
    derivationVersion: challenge.derivationVersion,
    signingPublicKey: challenge.signingPublicKey,
    encryptionPublicKey: challenge.encryptionPublicKey,
  });
  await userKey.save({ session });

  let creatorProfileResult: RegisteredCreatorProfile | null = null;

  if (body.profile.accountType === 'creator') {
    const creatorInput = body.profile.creatorProfile;

    if (!creatorInput) {
      throw new Error('Creator profile is missing after validation');
    }

    const creatorProfile = new CreatorProfile({
      user: user._id,
      ...creatorInput,
    });
    await creatorProfile.save({ session });

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

const registerUser = async (body: RegisterBody): Promise<RegisterUserResult> => {
  try {
    return await withDatabaseTransaction((session) => registerUserInTransaction(body, session));
  } catch (error: unknown) {
    if (isMongoDuplicateKeyError(error)) {
      return { ok: false, reason: duplicateKeyReason(error) };
    }

    throw error;
  }
};

export default registerUser;
export type {
  RegisteredCreatorProfile,
  RegisteredUser,
  RegistrationFailureReason,
  RegisterUserResult,
  RejectedRegistration,
  SuccessfulRegistration,
};
