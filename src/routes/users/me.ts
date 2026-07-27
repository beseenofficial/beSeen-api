import type { RequestHandler } from 'express';

import getCurrentUser from '../../utils/user/getCurrentUser';

const getMeRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const result = await getCurrentUser(req.auth.userId);

  if (!result.ok) {
    return res.status(401).j({
      status: 'error',
      message: 'The account is not available',
      result: { code: 'ACCOUNT_UNAVAILABLE' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Current user retrieved',
    result: {
      user: {
        ...result.user,
        createdAt: result.user.createdAt.toISOString(),
      },
    },
  });
};

export default getMeRoute;
