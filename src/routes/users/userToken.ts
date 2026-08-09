import type { RequestHandler } from 'express';

import getUserToken from '../../utils/token/getUserToken';
import { publicUsernameParamsSchema } from '../../validation/user/updateProfile';

const getUserTokenRoute: RequestHandler = async (req, res) => {
  const params = publicUsernameParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid username',
      result: { code: 'VALIDATION_ERROR' },
    });
  }

  const result = await getUserToken(params.data.username);
  if (!result.ok) {
    return res.status(404).j({
      status: 'error',
      message: 'User was not found',
      result: { code: 'USER_NOT_FOUND' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'User token retrieved',
    result: { token: { ...result.token, createdAt: result.token.createdAt.toISOString() } },
  });
};

export default getUserTokenRoute;
