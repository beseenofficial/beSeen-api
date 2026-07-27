import type { RequestHandler } from 'express';

import verifyRegistrationChallenge from '../../utils/auth/verifyRegistrationChallenge';
import type { RegistrationVerificationFailureReason } from '../../utils/auth/verifyRegistrationChallenge';
import registrationVerifyBodySchema from '../../validation/auth/registrationVerify';

interface VerificationErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

const verificationErrors: Record<RegistrationVerificationFailureReason, VerificationErrorResponse> =
  {
    challenge_not_found: {
      statusCode: 404,
      code: 'CHALLENGE_NOT_FOUND',
      message: 'Registration challenge was not found',
    },
    challenge_expired: {
      statusCode: 410,
      code: 'CHALLENGE_EXPIRED',
      message: 'Registration challenge has expired',
    },
    challenge_already_used: {
      statusCode: 409,
      code: 'CHALLENGE_ALREADY_USED',
      message: 'Registration challenge has already been used',
    },
    attempts_exceeded: {
      statusCode: 429,
      code: 'VERIFICATION_ATTEMPTS_EXCEEDED',
      message: 'Registration challenge verification attempts have been exceeded',
    },
    invalid_signature: {
      statusCode: 401,
      code: 'INVALID_STELLAR_SIGNATURE',
      message: 'Stellar signature is invalid',
    },
  };

const verifyRegistrationChallengeRoute: RequestHandler = async (req, res) => {
  const parsedBody = registrationVerifyBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid registration verification request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await verifyRegistrationChallenge(parsedBody.data);

  if (!result.ok) {
    const error = verificationErrors[result.reason];

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
    message: 'Registration challenge verified',
    result: {
      registrationToken: result.registrationToken,
      expiresAt: result.expiresAt.toISOString(),
    },
  });
};

export default verifyRegistrationChallengeRoute;
