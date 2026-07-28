import type { RequestHandler } from 'express';

import loginUser from '../../utils/auth/loginUser';
import type { LoginFailureReason } from '../../utils/auth/loginUser';
import loginBodySchema from '../../validation/auth/login';

interface LoginErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

const loginErrors: Record<LoginFailureReason, LoginErrorResponse> = {
  challenge_not_found: {
    statusCode: 404,
    code: 'CHALLENGE_NOT_FOUND',
    message: 'Login challenge was not found',
  },
  challenge_expired: {
    statusCode: 410,
    code: 'CHALLENGE_EXPIRED',
    message: 'Login challenge has expired',
  },
  challenge_already_used: {
    statusCode: 409,
    code: 'CHALLENGE_ALREADY_USED',
    message: 'Login challenge has already been used',
  },
  attempts_exceeded: {
    statusCode: 429,
    code: 'VERIFICATION_ATTEMPTS_EXCEEDED',
    message: 'Login challenge verification attempts have been exceeded',
  },
  invalid_challenge: {
    statusCode: 401,
    code: 'INVALID_SEP10_CHALLENGE',
    message: 'Signed SEP-10 challenge transaction is invalid',
  },
  account_unavailable: {
    statusCode: 403,
    code: 'ACCOUNT_UNAVAILABLE',
    message: 'The account is not available for login',
  },
};

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
      result: {
        code: error.code,
        ...(result.attemptsRemaining === undefined
          ? {}
          : { attemptsRemaining: result.attemptsRemaining }),
      },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Login successful',
    result: {
      user: {
        ...result.user,
        createdAt: result.user.createdAt.toISOString(),
      },
      auth: {
        ...result.auth,
        refreshTokenExpiresAt: result.auth.refreshTokenExpiresAt.toISOString(),
      },
    },
  });
};

export default loginRoute;
