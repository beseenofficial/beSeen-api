import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';

import User from '../../models/User';
import UserKey from '../../models/UserKey';
import UserToken from '../../models/UserToken';
import { withDatabaseTransaction } from '../../db';
import createAuthSession from './createAuthSession';
import type { AuthTokens } from './createAuthSession';
import type { AuthenticatedUser } from '../../types/auth';
import type { RegisterBody } from '../../validation/auth/register';
import { KEY_DERIVATION_VERSION } from '../../constant/auth';
import verifyBluxWallet from '../blux/verifyBluxWallet';
import processAvatar, { InvalidAvatarError } from '../avatar/processAvatar';
import { deleteAvatar, uploadAvatar } from '../avatar/avatarStorage';
import type { StoredAvatar } from '../avatar/avatarStorage';
import log from '../../logger';

type RegistrationFailureReason =
  | 'username_taken'
  | 'wallet_already_registered'
  | 'public_key_already_registered'
  | 'wallet_not_verified_by_blux'
  | 'blux_verification_unavailable'
  | 'invalid_avatar'
  | 'avatar_storage_unavailable';

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
  userId: Types.ObjectId,
  avatar: StoredAvatar | null,
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
    _id: userId,
    walletAddress: body.walletAddress,
    username: body.username,
    avatar: avatar?.publicUrl ?? null,
    avatarObjectKey: avatar?.objectKey ?? null,
  });
  await user.save({ session });

  const userKey = new UserKey({
    user: user._id,
    derivationVersion: KEY_DERIVATION_VERSION,
    signingPublicKey: body.keys.signing.publicKey,
    encryptionPublicKey: body.keys.encryption.publicKey,
  });
  await userKey.save({ session });

  const userToken = new UserToken({ owner: user._id });
  await userToken.save({ session });

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

const removeUploadedAvatar = async (avatar: StoredAvatar | null): Promise<void> => {
  if (!avatar) {
    return;
  }

  try {
    await deleteAvatar(avatar.objectKey);
  } catch (error: unknown) {
    log.warn({ error, objectKey: avatar.objectKey }, 'Failed to clean up registration avatar');
  }
};

const registerUser = async (
  body: RegisterBody,
  avatarFile?: Express.Multer.File,
): Promise<RegisterUserResult> => {
  const verification = await verifyBluxWallet(body.walletAddress);
  if (!verification.ok) {
    return { ok: false, reason: 'blux_verification_unavailable' };
  }
  if (!verification.verified) {
    return { ok: false, reason: 'wallet_not_verified_by_blux' };
  }

  const userId = new Types.ObjectId();
  let avatar: StoredAvatar | null = null;

  if (avatarFile) {
    let processedAvatar: Buffer;
    try {
      processedAvatar = await processAvatar(avatarFile.buffer);
    } catch (error: unknown) {
      if (error instanceof InvalidAvatarError) {
        return { ok: false, reason: 'invalid_avatar' };
      }
      throw error;
    }

    try {
      avatar = await uploadAvatar(userId, processedAvatar);
    } catch (error: unknown) {
      log.error({ error }, 'Failed to upload registration avatar');
      return { ok: false, reason: 'avatar_storage_unavailable' };
    }
  }

  try {
    const result = await withDatabaseTransaction((session) =>
      registerUserInTransaction(body, session, userId, avatar),
    );
    if (!result.ok) {
      await removeUploadedAvatar(avatar);
    }
    return result;
  } catch (error: unknown) {
    await removeUploadedAvatar(avatar);
    if (isMongoDuplicateKeyError(error)) {
      return { ok: false, reason: duplicateKeyReason(error) };
    }
    throw error;
  }
};

export default registerUser;
export type { RegistrationFailureReason, RegisterUserResult };
