import type { RequestHandler } from 'express';

import { broadcastDraftParamsSchema } from '../../validation/broadcast/draft';
import cancelBroadcastDraft from '../../utils/broadcast/cancelBroadcastDraft';

const cancelBroadcastDraftRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = broadcastDraftParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid broadcast draft ID',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedParams.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await cancelBroadcastDraft(req.auth.userId, parsedParams.data.draftId);

  if (!result.ok) {
    if (result.reason === 'published_broadcast') {
      return res.status(409).j({
        status: 'error',
        message: 'A published broadcast cannot be canceled as a draft',
        result: { code: 'BROADCAST_ALREADY_PUBLISHED' },
      });
    }

    return res.status(404).j({
      status: 'error',
      message: 'Broadcast draft was not found',
      result: { code: 'BROADCAST_DRAFT_NOT_FOUND' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: result.canceledNow ? 'Broadcast draft canceled' : 'Broadcast draft already canceled',
    result: {
      draft: {
        id: parsedParams.data.draftId,
        status: 'canceled',
        canceledAt: result.canceledAt.toISOString(),
        removedRecipientCount: result.removedRecipientCount,
      },
    },
  });
};

export default cancelBroadcastDraftRoute;
