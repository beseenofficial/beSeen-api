import type { RequestHandler } from 'express';

import getConversations from '../../utils/messenger/getConversations';
import { conversationListQuerySchema } from '../../validation/messenger/conversation';

const listConversationsRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedQuery = conversationListQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid conversation list query',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedQuery.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await getConversations(req.auth.userId, parsedQuery.data);

  if (!result.ok) {
    return res.status(401).j({
      status: 'error',
      message: 'The user account is not available',
      result: { code: 'ACCOUNT_UNAVAILABLE' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Conversations retrieved',
    result: {
      conversations: {
        ...result.conversations,
        items: result.conversations.items.map((conversation) => ({
          ...conversation,
          lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
          createdAt: conversation.createdAt.toISOString(),
        })),
      },
    },
  });
};

export default listConversationsRoute;
