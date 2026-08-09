import type { RequestHandler } from 'express';

import { messengerConversationErrors } from '../../types/errors/messenger';
import getConversationContext from '../../utils/messenger/getConversationContext';
import { conversationParamsSchema } from '../../validation/messenger/conversation';

const getConversationContextRoute: RequestHandler = async (req, res) => {
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

  const result = await getConversationContext(req.auth.userId, parsedParams.data.conversationId);

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
    message: 'Conversation encryption context retrieved',
    result: { context: result.context },
  });
};

export default getConversationContextRoute;
