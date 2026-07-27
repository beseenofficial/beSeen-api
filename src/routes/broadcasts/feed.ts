import type { RequestHandler } from 'express';

import getBroadcastFeed from '../../utils/broadcast/getBroadcastFeed';
import broadcastFeedQuerySchema from '../../validation/broadcast/feed';

const getBroadcastFeedRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedQuery = broadcastFeedQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid broadcast feed query',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedQuery.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await getBroadcastFeed(req.auth.userId, parsedQuery.data);

  if (!result.ok) {
    return res.status(401).j({
      status: 'error',
      message: 'The account is not available',
      result: { code: 'ACCOUNT_UNAVAILABLE' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Broadcast feed retrieved',
    result: {
      feed: {
        ...result.feed,
        items: result.feed.items.map((item) => ({
          ...item,
          publishedAt: item.publishedAt.toISOString(),
        })),
      },
    },
  });
};

export default getBroadcastFeedRoute;
