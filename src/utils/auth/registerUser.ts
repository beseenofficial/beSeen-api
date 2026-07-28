import type { ClientSession } from 'mongoose';

import { MAX_AUTH_CHALLENGE_ATTEMPTS } from '../../constant/auth';
import { withDatabaseTransaction } from '../../db';
import AuthChallenge from '../../models/AuthChallenge';
import type { AuthChallengeDocument } from '../../models/AuthChallenge';
import CreatorProfile from '../../models/CreatorProfile';
import User from '../../models/User';
import UserKey from '../../models/UserKey';
import type { AuthenticatedCreatorProfile, AuthenticatedUser } from '../../types/auth';
import type { RegisterBody } from '../../validation/auth/register';
import createAuthSession from './createAuthSession';
import type { AuthTokens } from './createAuthSession';
import { verifySep10Challenge } from '../stellar/sep10Challenge';

type RegistrationFailureReason =
  | 'challenge_not_found'
  | 'challenge_expired'
  | 'challenge_already_used'
  | 'attempts_exceeded'
  | 'invalid_challenge'
  | 'username_taken'
  | 'wallet_already_registered'
  | 'public_key_already_registered';

type RegisteredCreatorProfile = AuthenticatedCreatorProfile;
type RegisteredUser = AuthenticatedUser;

interface SuccessfulRegistration {
  ok: true;
  user: RegisteredUser;
  auth: AuthTokens;
}

interface RejectedRegistration {
  ok: false;
  reason: RegistrationFailureReason;
  attemptsRemaining?: number;
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

type ChallengeResolution =
  { ok: true; challenge: AuthChallengeDocument; now: Date } | RejectedRegistration;

const resolveChallenge = async (
  body: RegisterBody,
  session: ClientSession,
): Promise<ChallengeResolution> => {
  const now = new Date();

  const challenge = await AuthChallenge.findOne({
    _id: body.challengeId,
    purpose: 'registration',
  })
    .session(session)
    .exec();

  if (!challenge) {
    return { ok: false, reason: 'challenge_not_found' };
  }

  if (challenge.usedAt) {
    return { ok: false, reason: 'challenge_already_used' };
  }

  if (challenge.expiresAt <= now) {
    return { ok: false, reason: 'challenge_expired' };
  }

  if (challenge.attempts >= MAX_AUTH_CHALLENGE_ATTEMPTS) {
    return { ok: false, reason: 'attempts_exceeded' };
  }

  if (
    !verifySep10Challenge({
      signedTransactionXdr: body.signedTransactionXdr,
      storedTransactionXdr: challenge.transactionXdr,
      walletAddress: challenge.walletAddress,
      serverSigningPublicKey: challenge.serverSigningPublicKey,
      stellarNetwork: challenge.stellarNetwork,
      homeDomain: challenge.authDomain,
    })
  ) {
    await AuthChallenge.updateOne(
      {
        _id: challenge._id,
        usedAt: null,
        attempts: { $lt: MAX_AUTH_CHALLENGE_ATTEMPTS },
      },
      { $inc: { attempts: 1 } },
      { session },
    ).exec();

    return {
      ok: false,
      reason: 'invalid_challenge',
      attemptsRemaining: Math.max(0, MAX_AUTH_CHALLENGE_ATTEMPTS - challenge.attempts - 1),
    };
  }

  return { ok: true, challenge, now };
};

const registerUserInTransaction = async (
  body: RegisterBody,
  session: ClientSession,
): Promise<RegisterUserResult> => {
  const challengeResolution = await resolveChallenge(body, session);

  if (!challengeResolution.ok) {
    return challengeResolution;
  }

  const { challenge, now } = challengeResolution;

  if (
    !challenge ||
    !challenge.signingPublicKey ||
    !challenge.encryptionPublicKey ||
    !challenge.derivationVersion
  ) {
    return { ok: false, reason: 'challenge_not_found' };
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
      purpose: 'registration',
      usedAt: null,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_AUTH_CHALLENGE_ATTEMPTS },
    },
    { $set: { usedAt: now } },
    { new: true, session },
  ).exec();

  if (!consumedChallenge) {
    return {
      ok: false,
      reason: 'challenge_already_used',
    };
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

  const auth = await createAuthSession(
    { id: user._id, role: user.role, accountType: user.accountType },
    session,
  );

  return {
    ok: true,
    auth,
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
