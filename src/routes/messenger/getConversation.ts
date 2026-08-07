import type { RequestHandler } from 'express';

import { messengerConversationErrors } from '../../types/errors/messenger';
import getConversation from '../../utils/messenger/getConversation';
import { conversationParamsSchema } from '../../validation/messenger/conversation';

const getConversationRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = conversationParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid conversation ID',
      result: { code: 'VALIDATION_ERROR' },
    });
  }

  const result = await getConversation(req.auth.userId, parsedParams.data.conversationId);

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
    message: 'Conversation retrieved',
    result: {
      conversation: {
        ...result.conversation,
        lastMessageAt: result.conversation.lastMessageAt?.toISOString() ?? null,
        createdAt: result.conversation.createdAt.toISOString(),
      },
    },
  });
};

export default getConversationRoute;
