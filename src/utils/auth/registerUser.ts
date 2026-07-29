import type { ClientSession } from 'mongoose';

import { withDatabaseTransaction } from '../../db';
import User from '../../models/User';
import UserKey from '../../models/UserKey';
import type { AuthenticatedUser } from '../../types/auth';
import type { RegisterBody } from '../../validation/auth/register';
import createAuthSession from './createAuthSession';
import type { AuthTokens } from './createAuthSession';

type RegistrationFailureReason =
  | 'username_taken'
  | 'wallet_already_registered'
  | 'public_key_already_registered';

type RegisterUserResult =
  | { ok: true; user: AuthenticatedUser; auth: AuthTokens }
  | { ok: false; reason: RegistrationFailureReason };

interface MongoDuplicateKeyError extends Error {
  code: number;
  keyPattern?: Record<string, number>;
}

const isMongoDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError =>
  error instanceof Error && 'code' in error && error.code === 11_000;

const duplicateKeyReason = (error: MongoDuplicateKeyError): RegistrationFailureReason => {
  const keyPattern = error.keyPattern ?? {};
  if ('username' in keyPattern) return 'username_taken';
  if ('walletAddress' in keyPattern || 'user' in keyPattern) return 'wallet_already_registered';
  return 'public_key_already_registered';
};

const registerUserInTransaction = async (
  body: RegisterBody,
  session: ClientSession,
): Promise<RegisterUserResult> => {
  if (await User.exists({ walletAddress: body.walletAddress }).session(session).exec()) {
    return { ok: false, reason: 'wallet_already_registered' };
  }

  if (await User.exists({ username: body.username }).session(session).exec()) {
    return { ok: false, reason: 'username_taken' };
  }

  if (
    await UserKey.exists({
      $or: [
        { signingPublicKey: body.keys.signing.publicKey },
        { encryptionPublicKey: body.keys.encryption.publicKey },
      ],
    })
      .session(session)
      .exec()
  ) {
    return { ok: false, reason: 'public_key_already_registered' };
  }

  const user = new User({
    walletAddress: body.walletAddress,
    username: body.username,
    avatar: body.avatar,
  });
  await user.save({ session });

  const userKey = new UserKey({
    user: user._id,
    derivationVersion: body.keys.derivationVersion,
    signingPublicKey: body.keys.signing.publicKey,
    encryptionPublicKey: body.keys.encryption.publicKey,
  });
  await userKey.save({ session });

  const auth = await createAuthSession({ id: user._id, role: user.role }, session);

  return {
    ok: true,
    auth,
    user: {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
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
export type { RegistrationFailureReason, RegisterUserResult };
