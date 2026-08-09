import log from '../../logger';
import User from '../../models/User';
import type { StoredAvatar } from '../../types/avatar';
import type { UpdateCurrentUserResult } from '../../types/user';
import { deleteAvatar, uploadAvatar } from '../avatar/avatarStorage';
import processAvatar, { InvalidAvatarError } from '../avatar/processAvatar';
import type { UpdateProfileBody } from '../../validation/user/updateProfile';

const isUsernameDuplicateError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 11_000;

const deleteAvatarBestEffort = async (objectKey: string, context: string): Promise<void> => {
  try {
    await deleteAvatar(objectKey);
  } catch (error: unknown) {
    log.warn({ error, objectKey }, context);
  }
};

const updateCurrentUser = async (
  userId: string,
  body: UpdateProfileBody,
  avatarFile?: Express.Multer.File,
): Promise<UpdateCurrentUserResult> => {
  const user = await User.findOne({ _id: userId, status: 'active', deletedAt: null })
    .select('+avatarObjectKey')
    .exec();
  if (!user) {
    return { ok: false, reason: 'account_unavailable' };
  }

  if (body.username && body.username !== user.username) {
    const owner = await User.exists({ username: body.username, _id: { $ne: user._id } }).exec();
    if (owner) {
      return { ok: false, reason: 'username_taken' };
    }
  }

  let uploadedAvatar: StoredAvatar | null = null;
  const previousAvatarObjectKey = user.avatarObjectKey;

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
      uploadedAvatar = await uploadAvatar(user._id, processedAvatar);
    } catch (error: unknown) {
      log.error({ error, userId }, 'Failed to upload profile avatar');
      return { ok: false, reason: 'avatar_storage_unavailable' };
    }
  }

  if (body.username !== undefined) {
    user.username = body.username;
  }
  if (uploadedAvatar) {
    user.avatar = uploadedAvatar.publicUrl;
    user.avatarObjectKey = uploadedAvatar.objectKey;
  } else if (body.removeAvatar) {
    user.avatar = null;
    user.avatarObjectKey = null;
  }

  try {
    await user.save();
  } catch (error: unknown) {
    if (uploadedAvatar) {
      await deleteAvatarBestEffort(
        uploadedAvatar.objectKey,
        'Failed to clean up an uncommitted profile avatar',
      );
    }
    if (isUsernameDuplicateError(error)) {
      return { ok: false, reason: 'username_taken' };
    }
    throw error;
  }

  if ((uploadedAvatar || body.removeAvatar) && previousAvatarObjectKey) {
    await deleteAvatarBestEffort(previousAvatarObjectKey, 'Failed to delete the previous avatar');
  }

  return {
    ok: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      createdAt: user.createdAt,
    },
  };
};

export default updateCurrentUser;
