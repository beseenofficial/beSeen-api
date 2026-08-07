import type { RequestHandler } from 'express';

import { messengerConversationErrors } from '../../types/errors/messenger';
import getMessageHistory from '../../utils/messenger/getMessageHistory';
import { conversationParamsSchema } from '../../validation/messenger/conversation';
import messageHistoryQuerySchema from '../../validation/messenger/messageHistory';

const getMessageHistoryRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = conversationParamsSchema.safeParse(req.params);
  const parsedQuery = messageHistoryQuerySchema.safeParse(req.query);

  if (!parsedParams.success || !parsedQuery.success) {
    const issues = [
      ...(parsedParams.success ? [] : parsedParams.error.issues),
      ...(parsedQuery.success ? [] : parsedQuery.error.issues),
    ];

    return res.status(400).j({
      status: 'error',
      message: 'Invalid message history request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await getMessageHistory(
    req.auth.userId,
    parsedParams.data.conversationId,
    parsedQuery.data,
  );

  if (!result.ok) {
    const error = messengerConversationErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Encrypted message history retrieved',
    result: {
      history: {
        ...result.history,
        items: result.history.items.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })),
      },
    },
  });
};

export default getMessageHistoryRoute;
