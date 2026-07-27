import type { RequestHandler } from 'express';

import getPublicProfile from '../../utils/user/getPublicProfile';
import { publicUsernameParamsSchema } from '../../validation/user/updateProfile';

const getPublicProfileRoute: RequestHandler = async (req, res) => {
  const parsedParams = publicUsernameParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid username',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedParams.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await getPublicProfile(parsedParams.data.username);

  if (!result.ok) {
    return res.status(404).j({
      status: 'error',
      message: 'User was not found',
      result: { code: 'USER_NOT_FOUND' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Public profile retrieved',
    result: {
      user: {
        ...result.user,
        createdAt: result.user.createdAt.toISOString(),
      },
    },
  });
};

export default getPublicProfileRoute;
