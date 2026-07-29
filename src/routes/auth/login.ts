import type { RequestHandler } from 'express';

import loginUser from '../../utils/auth/loginUser';
import { loginErrors } from '../../types/errors/auth';
import loginBodySchema from '../../validation/auth/login';

const loginRoute: RequestHandler = async (req, res) => {
  const parsedBody = loginBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid login request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await loginUser(parsedBody.data);
  
  if (!result.ok) {
    const error = loginErrors[result.reason];
    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Login successful',
    result: {
      user: { ...result.user, createdAt: result.user.createdAt.toISOString() },
      auth: {
        ...result.auth,
        refreshTokenExpiresAt: result.auth.refreshTokenExpiresAt.toISOString(),
      },
    },
  });
};

export default loginRoute;
