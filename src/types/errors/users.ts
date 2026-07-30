import type { UpdateProfileFailureReason } from '../../utils/user/updateCurrentUser';

export const updateErrors: Record<
  UpdateProfileFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  account_unavailable: {
    statusCode: 401,
    code: 'ACCOUNT_UNAVAILABLE',
    message: 'The account is not available',
  },
  username_taken: {
    statusCode: 409,
    code: 'USERNAME_TAKEN',
    message: 'Username is already taken',
  },
  invalid_avatar: {
    statusCode: 400,
    code: 'INVALID_AVATAR',
    message: 'Avatar must be a valid JPEG, PNG, or WebP image of at least 128x128 pixels',
  },
  avatar_storage_unavailable: {
    statusCode: 503,
    code: 'AVATAR_STORAGE_UNAVAILABLE',
    message: 'Avatar storage is temporarily unavailable',
  },
};
