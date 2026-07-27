import type { RequestHandler } from 'express';

import createBroadcastDraft from '../../utils/broadcast/createBroadcastDraft';
import type { CreateBroadcastDraftFailureReason } from '../../utils/broadcast/createBroadcastDraft';
import { createBroadcastDraftBodySchema } from '../../validation/broadcast/draft';

const draftErrors: Record<
  CreateBroadcastDraftFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  creator_unavailable: {
    statusCode: 401,
    code: 'ACCOUNT_UNAVAILABLE',
    message: 'The creator account is not available',
  },
  creator_required: {
    statusCode: 403,
    code: 'CREATOR_ACCOUNT_REQUIRED',
    message: 'Only creator accounts can create broadcasts',
  },
  creator_active_keys_not_found: {
    statusCode: 409,
    code: 'ACTIVE_KEYS_NOT_FOUND',
    message: 'The creator does not have active encryption keys',
  },
};

const createBroadcastDraftRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedBody = createBroadcastDraftBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid broadcast draft',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await createBroadcastDraft(req.auth.userId, parsedBody.data);

  if (!result.ok) {
    const error = draftErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(result.created ? 201 : 200).j({
    status: 'success',
    message: result.created ? 'Broadcast draft created' : 'Broadcast draft already exists',
    result: {
      draft: {
        ...result.draft,
        createdAt: result.draft.createdAt.toISOString(),
      },
    },
  });
};

export default createBroadcastDraftRoute;
