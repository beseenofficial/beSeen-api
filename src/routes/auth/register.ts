import type { RequestHandler } from 'express';

import registerUser from '../../utils/auth/registerUser';
import { registrationErrors } from '../../types/errors/auth';
import registerBodySchema from '../../validation/auth/register';
import parseRegistrationRequestBody from '../../utils/auth/parseRegistrationRequestBody';

const registerRoute: RequestHandler = async (req, res) => {
  const parsedBody = registerBodySchema.safeParse(parseRegistrationRequestBody(req.body));
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

  const result = await registerUser(parsedBody.data, req.file);
  if (!result.ok) {
    const error = registrationErrors[result.reason];
    return res.status(error.statusCode).j({
      status: 'error',
      message: error.message,
      result: { code: error.code },
    });
  }

  return res.status(201).j({
    status: 'success',
    message: 'User registered successfully',
    result: {
      user: { ...result.user, createdAt: result.user.createdAt.toISOString() },
      auth: {
        ...result.auth,
        refreshTokenExpiresAt: result.auth.refreshTokenExpiresAt.toISOString(),
      },
    },
  });
};

export default registerRoute;
