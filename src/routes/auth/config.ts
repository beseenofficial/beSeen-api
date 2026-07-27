import type { RequestHandler } from 'express';

import getAuthClientConfig from '../../utils/auth/getAuthClientConfig';
import authConfigQuerySchema from '../../validation/auth/config';

const getAuthConfigRoute: RequestHandler = (req, res) => {
  const parsedQuery = authConfigQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid authentication configuration request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedQuery.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Authentication client configuration retrieved',
    result: getAuthClientConfig(parsedQuery.data.walletAddress),
  });
};

export default getAuthConfigRoute;
