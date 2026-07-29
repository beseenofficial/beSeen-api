import { UpdateProfileFailureReason } from "../../utils/user/updateCurrentUser";

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
};