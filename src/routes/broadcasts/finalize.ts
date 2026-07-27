import type { RequestHandler } from 'express';

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

    const errors = {
      draft_not_found: {
        statusCode: 404,
        code: 'BROADCAST_DRAFT_NOT_FOUND',
        message: 'Broadcast draft was not found',
      },
      draft_expired: {
        statusCode: 410,
        code: 'BROADCAST_DRAFT_EXPIRED',
        message: 'Broadcast draft has expired',
      },
      audience_snapshot_mismatch: {
        statusCode: 409,
        code: 'AUDIENCE_SNAPSHOT_MISMATCH',
        message: 'The frozen broadcast audience is inconsistent',
      },
      invalid_signature: {
        statusCode: 401,
        code: 'INVALID_BROADCAST_SIGNATURE',
        message: 'The encrypted broadcast signature is invalid',
      },
      finalization_conflict: {
        statusCode: 409,
        code: 'BROADCAST_FINALIZATION_CONFLICT',
        message: 'This broadcast was already finalized with different encrypted content',
      },
    } as const;
    const error = errors[result.reason];

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
