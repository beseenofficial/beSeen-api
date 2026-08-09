import type { RequestHandler } from 'express';

import { messengerReadErrors } from '../../types/errors/messenger';
import markConversationRead from '../../utils/messenger/markConversationRead';
import { conversationParamsSchema } from '../../validation/messenger/conversation';
import markConversationReadBodySchema from '../../validation/messenger/markConversationRead';

const markConversationReadRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = conversationParamsSchema.safeParse(req.params);

  const parsedBody = markConversationReadBodySchema.safeParse(req.body);

  if (!parsedParams.success || !parsedBody.success) {
    const issues = [
      ...(parsedParams.success ? [] : parsedParams.error.issues),
      ...(parsedBody.success ? [] : parsedBody.error.issues),
    ];

    return res.status(400).j({
      status: 'error',
      message: 'Invalid conversation read request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await markConversationRead(
    req.auth.userId,
    parsedParams.data.conversationId,
    parsedBody.data.throughSequence,
  );

  if (!result.ok) {
    const error = messengerReadErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: result.updated ? 'Conversation read cursor updated' : 'Conversation already read',
    result: {
      readState: result.readState,
      updated: result.updated,
    },
  });
};

export default markConversationReadRoute;
