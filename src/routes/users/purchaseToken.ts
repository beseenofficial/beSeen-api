import type { RequestHandler } from 'express';

import purchaseUserToken from '../../utils/token/purchaseUserToken';
import { publicUsernameParamsSchema } from '../../validation/user/updateProfile';

const purchaseUserTokenRoute: RequestHandler = async (req, res) => {
  if (!req.auth) {
    return res.status(401).j({ status: 'error', message: 'Authentication is required', result: { code: 'UNAUTHORIZED' } });
  }

  const params = publicUsernameParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).j({ status: 'error', message: 'Invalid username', result: { code: 'VALIDATION_ERROR' } });
  }

  const result = await purchaseUserToken(req.auth.userId, params.data.username);
  if (!result.ok) {
    const status = result.reason === 'user_not_found' ? 404 : result.reason === 'own_token' ? 409 : 401;
    const code = result.reason === 'user_not_found' ? 'USER_NOT_FOUND' : result.reason === 'own_token' ? 'OWN_TOKEN_NOT_ALLOWED' : 'ACCOUNT_UNAVAILABLE';
    return res.status(status).j({ status: 'error', message: result.reason === 'own_token' ? 'You cannot buy your own token' : 'The user is not available', result: { code } });
  }

  return res.status(result.created ? 201 : 200).j({
    status: 'success',
    message: result.created ? 'Token purchased' : 'Token already owned',
    result: { holding: { ...result.holding, acquiredAt: result.holding.acquiredAt.toISOString() } },
  });
};

export default purchaseUserTokenRoute;
