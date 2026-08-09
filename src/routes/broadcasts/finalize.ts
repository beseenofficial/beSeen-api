import type { RequestHandler } from 'express';

import { finalizeErrors } from '../../types/errors/broadcasts';
import finalizeBroadcast from '../../utils/broadcast/finalizeBroadcast';
import { broadcastDraftParamsSchema } from '../../validation/broadcast/draft';
import finalizeBroadcastBodySchema from '../../validation/broadcast/finalize';

const finalizeBroadcastRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = broadcastDraftParamsSchema.safeParse(req.params);

  const parsedBody = finalizeBroadcastBodySchema.safeParse(req.body);

  if (!parsedParams.success || !parsedBody.success) {
    const issues = [
      ...(parsedParams.success ? [] : parsedParams.error.issues),
      ...(parsedBody.success ? [] : parsedBody.error.issues),
    ];

    return res.status(400).j({
      status: 'error',
      message: 'Invalid encrypted broadcast finalization',
      result: {
        code: 'VALIDATION_ERROR',
        issues: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await finalizeBroadcast(
    req.auth.userId,
    parsedParams.data.draftId,
    parsedBody.data,
  );

  if (!result.ok) {
    if (result.reason === 'recipient_keys_incomplete') {
      return res.status(409).j({
        status: 'error',
        message: 'Not every recipient has an encrypted broadcast key',
        result: {
          code: 'RECIPIENT_KEYS_INCOMPLETE',
          remainingCount: result.remainingCount,
        },
      });
    }

    const error = finalizeErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: result.publishedNow ? 'Broadcast published' : 'Broadcast already published',
    result: {
      broadcast: {
        ...result.broadcast,
        publishedAt: result.broadcast.publishedAt.toISOString(),
      },
    },
  });
};

export default finalizeBroadcastRoute;
