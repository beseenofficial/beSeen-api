import type { RequestHandler } from 'express';

import { uploadErrors } from '../../types/errors/broadcasts';
import { broadcastDraftParamsSchema } from '../../validation/broadcast/draft';
import uploadBroadcastRecipientKeys from '../../utils/broadcast/uploadBroadcastRecipientKeys';
import uploadBroadcastRecipientKeysBodySchema from '../../validation/broadcast/uploadRecipientKeys';

const uploadBroadcastRecipientKeysRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = broadcastDraftParamsSchema.safeParse(req.params);
  const parsedBody = uploadBroadcastRecipientKeysBodySchema.safeParse(req.body);

  if (!parsedParams.success || !parsedBody.success) {
    const issues = [
      ...(parsedParams.success ? [] : parsedParams.error.issues),
      ...(parsedBody.success ? [] : parsedBody.error.issues),
    ];

    return res.status(400).j({
      status: 'error',
      message: 'Invalid encrypted-key batch',
      result: {
        code: 'VALIDATION_ERROR',
        issues: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await uploadBroadcastRecipientKeys(
    req.auth.userId,
    parsedParams.data.draftId,
    parsedBody.data,
  );

  if (!result.ok) {
    const error = uploadErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Encrypted broadcast keys stored',
    result: { progress: result.progress },
  });
};

export default uploadBroadcastRecipientKeysRoute;
