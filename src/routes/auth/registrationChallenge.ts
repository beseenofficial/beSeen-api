import type { RequestHandler } from 'express';

import createRegistrationChallenge from '../../utils/auth/createRegistrationChallenge';
import registrationChallengeBodySchema from '../../validation/auth/registrationChallenge';

const createRegistrationChallengeRoute: RequestHandler = async (req, res) => {
  const parsedBody = registrationChallengeBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid registration challenge request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await createRegistrationChallenge(parsedBody.data);

  if (!result.ok) {
    const isWalletConflict = result.reason === 'wallet_already_registered';

    return res.status(409).j({
      status: 'error',
      message: isWalletConflict
        ? 'Wallet is already registered'
        : 'A BeSeen public key is already registered',
      result: {
        code: isWalletConflict ? 'WALLET_ALREADY_REGISTERED' : 'PUBLIC_KEY_ALREADY_REGISTERED',
      },
    });
  }

  return res.status(201).j({
    status: 'success',
    message: 'Registration challenge created',
    result: {
      challengeId: result.challengeId,
      message: result.message,
      expiresAt: result.expiresAt.toISOString(),
    },
  });
};

export default createRegistrationChallengeRoute;
