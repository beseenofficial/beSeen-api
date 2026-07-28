import type { RequestHandler } from 'express';

import createLoginChallenge from '../../utils/auth/createLoginChallenge';
import loginChallengeBodySchema from '../../validation/auth/loginChallenge';

const createLoginChallengeRoute: RequestHandler = async (req, res) => {
  const parsedBody = loginChallengeBodySchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid login challenge request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedBody.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await createLoginChallenge(parsedBody.data);

  if (!result.ok) {
    return res.status(404).j({
      status: 'error',
      message: 'An active account for this wallet was not found',
      result: { code: 'ACCOUNT_UNAVAILABLE' },
    });
  }

  return res.status(201).j({
    status: 'success',
    message: 'Login challenge created',
    result: {
      challengeId: result.challengeId,
      authenticationStandard: 'SEP-10',
      transactionXdr: result.transactionXdr,
      stellarNetwork: result.stellarNetwork,
      networkPassphrase: result.networkPassphrase,
      serverSigningPublicKey: result.serverSigningPublicKey,
      homeDomain: result.homeDomain,
      expiresAt: result.expiresAt.toISOString(),
    },
  });
};

export default createLoginChallengeRoute;
