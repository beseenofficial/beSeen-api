import type { RequestHandler } from 'express';

import { updateErrors } from '../../types/errors/users';
import updateCurrentUser from '../../utils/user/updateCurrentUser';
import parseProfileUpdateRequestBody from '../../utils/user/parseProfileUpdateRequestBody';
import updateProfileBodySchema from '../../validation/user/updateProfile';

const updateMeRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedBody = updateProfileBodySchema.safeParse(parseProfileUpdateRequestBody(req.body));

  if (
    !parsedBody.success ||
    (parsedBody.success && Object.keys(parsedBody.data).length === 0 && !req.file) ||
    (parsedBody.success && parsedBody.data.removeAvatar === true && Boolean(req.file))
  ) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid profile update',
      result: {
        code: 'VALIDATION_ERROR',
        issues: !parsedBody.success
          ? parsedBody.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            }))
          : [
              {
                path: 'avatar',
                message: req.file
                  ? 'Avatar file and removeAvatar cannot be sent together'
                  : 'Profile update cannot be empty',
              },
            ],
      },
    });
  }

  const result = await updateCurrentUser(req.auth.userId, parsedBody.data, req.file);

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
