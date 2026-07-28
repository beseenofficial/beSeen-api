import type { ClientSession } from 'mongoose';

import { MAX_AUTH_CHALLENGE_ATTEMPTS } from '../../constant/auth';
import { withDatabaseTransaction } from '../../db';
import AuthChallenge from '../../models/AuthChallenge';
import CreatorProfile from '../../models/CreatorProfile';
import User from '../../models/User';
import type { AuthenticatedCreatorProfile, AuthenticatedUser } from '../../types/auth';
import type { LoginBody } from '../../validation/auth/login';
import { verifySep10Challenge } from '../stellar/sep10Challenge';
import createAuthSession from './createAuthSession';
import type { AuthTokens } from './createAuthSession';

type LoginFailureReason =
  | 'challenge_not_found'
  | 'challenge_expired'
  | 'challenge_already_used'
  | 'attempts_exceeded'
  | 'invalid_challenge'
  | 'account_unavailable';

type LoginUserResult =
  | { ok: true; user: AuthenticatedUser; auth: AuthTokens }
  | { ok: false; reason: LoginFailureReason; attemptsRemaining?: number };

const loginUserInTransaction = async (
  body: LoginBody,
  session: ClientSession,
): Promise<LoginUserResult> => {
  const challenge = await AuthChallenge.findOne({
    _id: body.challengeId,
    purpose: 'login',
  })
    .session(session)
    .exec();

  if (!challenge) {
    return { ok: false, reason: 'challenge_not_found' };
  }

  const now = new Date();

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

  const user = await User.findOne({
    walletAddress: challenge.walletAddress,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  let creatorProfileResult: AuthenticatedCreatorProfile | null = null;

  if (user.accountType === 'creator') {
    const creatorProfile = await CreatorProfile.findOne({ user: user._id }).session(session).exec();

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

  const consumedChallenge = await AuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      purpose: 'login',
      usedAt: null,
      expiresAt: { $gt: now },
      attempts: { $lt: MAX_AUTH_CHALLENGE_ATTEMPTS },
    },
    { $set: { usedAt: now } },
    { new: true, session },
  ).exec();

  if (!consumedChallenge) {
    return { ok: false, reason: 'challenge_already_used' };
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

const loginUser = (body: LoginBody): Promise<LoginUserResult> =>
  withDatabaseTransaction((session) => loginUserInTransaction(body, session));

export default loginUser;
export type { LoginFailureReason, LoginUserResult };
