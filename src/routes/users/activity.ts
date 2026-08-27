import type { RequestHandler } from 'express';

import recordUserActivity from '../../utils/user/recordUserActivity';

const recordUserActivityRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const result = await recordUserActivity(req.auth.userId);
  if (!result.ok) {
    return res.status(401).j({
      status: 'error',
      message: 'The account is not available',
      result: { code: 'ACCOUNT_UNAVAILABLE' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'User activity recorded',
    result: {
      activity: {
        ...result.activity,
        lastActiveAt: result.activity.lastActiveAt.toISOString(),
      },
    },
  });
};

export default recordUserActivityRoute;
