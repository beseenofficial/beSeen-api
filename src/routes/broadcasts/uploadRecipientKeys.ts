import type { RequestHandler } from 'express';

import uploadBroadcastRecipientKeys from '../../utils/broadcast/uploadBroadcastRecipientKeys';
import type { UploadBroadcastRecipientKeysFailureReason } from '../../utils/broadcast/uploadBroadcastRecipientKeys';
import { broadcastDraftParamsSchema } from '../../validation/broadcast/draft';
import uploadBroadcastRecipientKeysBodySchema from '../../validation/broadcast/uploadRecipientKeys';

const uploadErrors: Record<
  UploadBroadcastRecipientKeysFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  draft_not_found: {
    statusCode: 404,
    code: 'BROADCAST_DRAFT_NOT_FOUND',
    message: 'Broadcast draft was not found',
  },
  recipient_not_in_audience: {
    statusCode: 409,
    code: 'RECIPIENT_NOT_IN_AUDIENCE',
    message: 'A recipient does not belong to the frozen audience',
  },
  key_version_mismatch: {
    statusCode: 409,
    code: 'KEY_VERSION_MISMATCH',
    message: 'A recipient key version does not match the frozen audience',
  },
  encrypted_key_conflict: {
    statusCode: 409,
    code: 'ENCRYPTED_KEY_CONFLICT',
    message: 'A different encrypted key was already stored for a recipient',
  },
};

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
