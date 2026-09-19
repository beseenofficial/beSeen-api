import type { RequestHandler } from 'express';

import getAvailableBountySummary from '../../utils/messenger/getAvailableBountySummary';

const getBountySummaryRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const summary = await getAvailableBountySummary(req.auth.userId);

  return res.status(200).j({
    status: 'success',
    message: 'Available bounty summary retrieved',
    result: {
      unclaimedCount: summary.unclaimedCount,
      updatedAt: summary.updatedAt.toISOString(),
    },
  });
};

export default getBountySummaryRoute;
