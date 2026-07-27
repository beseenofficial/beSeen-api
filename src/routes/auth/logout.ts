import type { RequestHandler } from 'express';

import revokeAuthSession from '../../utils/auth/revokeAuthSession';

const logoutRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  await revokeAuthSession(req.auth.sessionId, req.auth.userId);

  return res.status(200).j({
    status: 'success',
    message: 'Logout successful',
    result: {},
  });
};

export default logoutRoute;
