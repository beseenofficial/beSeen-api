import type { RequestHandler } from 'express';

import sendMessage from '../../utils/messenger/sendMessage';
import { messengerSendErrors } from '../../types/errors/messenger';
import sendMessageBodySchema from '../../validation/messenger/sendMessage';
import { conversationParamsSchema } from '../../validation/messenger/conversation';

const sendMessageRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = conversationParamsSchema.safeParse(req.params);

  const parsedBody = sendMessageBodySchema.safeParse(req.body);

  if (!parsedParams.success || !parsedBody.success) {
    const issues = [
      ...(parsedParams.success ? [] : parsedParams.error.issues),
      ...(parsedBody.success ? [] : parsedBody.error.issues),
    ];

    return res.status(400).j({
      status: 'error',
      message: 'Invalid encrypted message request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await sendMessage(
    req.auth.userId,
    parsedParams.data.conversationId,
    parsedBody.data,
  );

  if (!result.ok) {
    const error = messengerSendErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(result.created ? 201 : 200).j({
    status: 'success',
    message: result.created ? 'Encrypted message sent' : 'Encrypted message already sent',
    result: {
      message: {
        ...result.message,
        bounty: result.message.bounty
          ? {
              ...result.message.bounty,
              expiresAt: result.message.bounty.expiresAt.toISOString(),
              claimableAt: result.message.bounty.claimableAt?.toISOString() ?? null,
              claimedAt: result.message.bounty.claimedAt?.toISOString() ?? null,
            }
          : null,
        unlockedBounty: result.message.unlockedBounty
          ? {
              ...result.message.unlockedBounty,
              expiresAt: result.message.unlockedBounty.expiresAt.toISOString(),
              claimableAt: result.message.unlockedBounty.claimableAt?.toISOString() ?? null,
              claimedAt: result.message.unlockedBounty.claimedAt?.toISOString() ?? null,
            }
          : null,
        createdAt: result.message.createdAt.toISOString(),
      },
    },
  });
};

export default sendMessageRoute;
