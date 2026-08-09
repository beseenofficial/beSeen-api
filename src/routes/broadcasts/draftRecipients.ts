import type { RequestHandler } from 'express';

import getBroadcastDraftRecipients from '../../utils/broadcast/getBroadcastDraftRecipients';
import {
  broadcastDraftParamsSchema,
  broadcastRecipientPageQuerySchema,
} from '../../validation/broadcast/draft';

const getBroadcastDraftRecipientsRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = broadcastDraftParamsSchema.safeParse(req.params);

  const parsedQuery = broadcastRecipientPageQuerySchema.safeParse(req.query);

  if (!parsedParams.success || !parsedQuery.success) {
    const issues = [
      ...(parsedParams.success ? [] : parsedParams.error.issues),
      ...(parsedQuery.success ? [] : parsedQuery.error.issues),
    ];

    return res.status(400).j({
      status: 'error',
      message: 'Invalid broadcast recipient page',
      result: {
        code: 'VALIDATION_ERROR',
        issues: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await getBroadcastDraftRecipients(
    req.auth.userId,
    parsedParams.data.draftId,
    parsedQuery.data,
  );

  if (!result.ok) {
    return res.status(404).j({
      status: 'error',
      message: 'Broadcast draft was not found',
      result: { code: 'BROADCAST_DRAFT_NOT_FOUND' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Broadcast recipient public keys retrieved',
    result: {
      draft: { ...result.draft, expiresAt: result.draft.expiresAt.toISOString() },
      recipients: result.recipients,
    },
  });
};

export default getBroadcastDraftRecipientsRoute;
