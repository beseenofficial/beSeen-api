import type { RequestHandler } from 'express';

import { bountyParamsSchema } from '../../validation/messenger/bounty';
import { messengerBountyClaimErrors } from '../../types/errors/messenger';
import claimMessageBounty from '../../utils/messenger/claimMessageBounty';

const claimMessageBountyRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const parsedParams = bountyParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid bounty claim request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedParams.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await claimMessageBounty(req.auth.userId, parsedParams.data.bountyId);

  if (!result.ok) {
    const error = messengerBountyClaimErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: result.claimedNow ? 'Demo bounty claimed' : 'Demo bounty already claimed',
    result: {
      bounty: {
        ...result.bounty,
        expiresAt: result.bounty.expiresAt.toISOString(),
        claimableAt: result.bounty.claimableAt?.toISOString() ?? null,
        claimedAt: result.bounty.claimedAt?.toISOString() ?? null,
      },
      claimedNow: result.claimedNow,
    },
  });
};

export default claimMessageBountyRoute;
