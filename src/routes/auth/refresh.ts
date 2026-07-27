import type { RequestHandler } from 'express';

import refreshAuthSession from '../../utils/auth/refreshAuthSession';
import refreshBodySchema from '../../validation/auth/refresh';

const refreshRoute: RequestHandler = async (req, res) => {
  const parsedBody = refreshBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid refresh request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await refreshAuthSession(parsedBody.data.refreshToken);

  if (!result.ok) {
    return res.status(401).j({
      status: 'error',
      message: 'Refresh token is invalid or expired',
      result: { code: 'REFRESH_TOKEN_INVALID' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Session refreshed',
    result: {
      auth: {
        ...result.auth,
        refreshTokenExpiresAt: result.auth.refreshTokenExpiresAt.toISOString(),
      },
    },
  });
};

export default refreshRoute;
