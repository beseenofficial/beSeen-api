import type { RequestHandler } from 'express';

import updateCurrentUser from '../../utils/user/updateCurrentUser';
import type { UpdateProfileFailureReason } from '../../utils/user/updateCurrentUser';
import updateProfileBodySchema from '../../validation/user/updateProfile';

const updateErrors: Record<
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

const updateMeRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedBody = updateProfileBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid profile update',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await updateCurrentUser(req.auth.userId, parsedBody.data);

  if (!result.ok) {
    const error = updateErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Profile updated',
    result: {
      user: {
        ...result.user,
        createdAt: result.user.createdAt.toISOString(),
      },
    },
  });
};

export default updateMeRoute;
