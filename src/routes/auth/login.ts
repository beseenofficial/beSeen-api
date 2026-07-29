import type { RequestHandler } from 'express';

import loginUser from '../../utils/auth/loginUser';
import type { LoginFailureReason } from '../../utils/auth/loginUser';
import loginBodySchema from '../../validation/auth/login';

const loginErrors: Record<
  LoginFailureReason,
  { statusCode: number; code: string; message: string }
> = {
  proof_expired: {
    statusCode: 401,
    code: 'LOGIN_PROOF_EXPIRED',
    message: 'The signed login proof is outside the allowed time window',
  },
  proof_replayed: {
    statusCode: 409,
    code: 'LOGIN_PROOF_REPLAYED',
    message: 'This login proof was already used',
  },
  invalid_signature: {
    statusCode: 401,
    code: 'INVALID_LOGIN_SIGNATURE',
    message: 'The derived-key login signature is invalid',
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
