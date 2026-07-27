import type { RequestHandler } from 'express';

import getBroadcastDrafts from '../../utils/broadcast/getBroadcastDrafts';
import { broadcastDraftListQuerySchema } from '../../validation/broadcast/draft';

const getBroadcastDraftsRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedQuery = broadcastDraftListQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid broadcast draft list query',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedQuery.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await getBroadcastDrafts(req.auth.userId, parsedQuery.data);

  if (!result.ok) {
    return res.status(401).j({
      status: 'error',
      message: 'The account is not available',
      result: { code: 'ACCOUNT_UNAVAILABLE' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Broadcast drafts retrieved',
    result: {
      drafts: {
        ...result.drafts,
        items: result.drafts.items.map((draft) => ({
          ...draft,
          createdAt: draft.createdAt.toISOString(),
        })),
      },
    },
  });
};

export default getBroadcastDraftsRoute;
