import type { RequestHandler } from 'express';

import getMyTokens from '../../utils/token/getMyTokens';

const getMyTokensRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({
      status: 'error',
      message: 'Authentication is required',
      result: { code: 'UNAUTHORIZED' },
    });
  }

  const result = await getMyTokens(req.auth.userId);
  if (!result.ok) {
    return res.status(401).j({
      status: 'error',
      message: 'The account is not available',
      result: { code: 'ACCOUNT_UNAVAILABLE' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Owned tokens retrieved',
    result: {
      tokens: result.tokens.map((token) => ({
        ...token,
        createdAt: token.createdAt.toISOString(),
        acquiredAt: token.acquiredAt.toISOString(),
      })),
    },
  });
};

export default getMyTokensRoute;
