import type { RequestHandler } from 'express';

import registerUser from '../../utils/auth/registerUser';
import type { RegistrationFailureReason } from '../../utils/auth/registerUser';
import registerBodySchema from '../../validation/auth/register';

interface RegistrationErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

const registrationErrors: Record<RegistrationFailureReason, RegistrationErrorResponse> = {
  registration_token_invalid: {
    statusCode: 401,
    code: 'REGISTRATION_TOKEN_INVALID',
    message: 'Registration token is invalid, expired, or already used',
  },
  username_taken: {
    statusCode: 409,
    code: 'USERNAME_TAKEN',
    message: 'Username is already taken',
  },
  wallet_already_registered: {
    statusCode: 409,
    code: 'WALLET_ALREADY_REGISTERED',
    message: 'Wallet is already registered',
  },
  public_key_already_registered: {
    statusCode: 409,
    code: 'PUBLIC_KEY_ALREADY_REGISTERED',
    message: 'A BeSeen public key is already registered',
  },
};

const registerRoute: RequestHandler = async (req, res) => {
  const parsedBody = registerBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid registration request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await registerUser(parsedBody.data);

  if (!result.ok) {
    const error = registrationErrors[result.reason];

    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: {
        code: error.code,
      },
    });
  }

  return res.status(201).j({
    status: 'success',
    message: 'User registered successfully',
    result: {
      user: {
        ...result.user,
        createdAt: result.user.createdAt.toISOString(),
      },
    },
  });
};

export default registerRoute;
