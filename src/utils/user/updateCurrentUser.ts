import User from '../../models/User';
import type { AuthenticatedUser } from '../../types/auth';
import type { UpdateProfileBody } from '../../validation/user/updateProfile';

type UpdateProfileFailureReason = 'account_unavailable' | 'username_taken';
type UpdateCurrentUserResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; reason: UpdateProfileFailureReason };

const isUsernameDuplicateError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 11_000;

const updateCurrentUser = async (
  userId: string,
  body: UpdateProfileBody,
): Promise<UpdateCurrentUserResult> => {
  const user = await User.findOne({ _id: userId, status: 'active', deletedAt: null }).exec();
  if (!user) return { ok: false, reason: 'account_unavailable' };

  if (body.username && body.username !== user.username) {
    const owner = await User.exists({ username: body.username, _id: { $ne: user._id } }).exec();
    if (owner) return { ok: false, reason: 'username_taken' };
  }

  if (body.username !== undefined) user.username = body.username;
  if (body.avatar !== undefined) user.avatar = body.avatar;

  try {
    await user.save();
  } catch (error: unknown) {
    if (isUsernameDuplicateError(error)) return { ok: false, reason: 'username_taken' };
    throw error;
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
export type { UpdateCurrentUserResult, UpdateProfileFailureReason };
