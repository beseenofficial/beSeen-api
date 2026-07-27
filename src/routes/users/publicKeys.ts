import type { RequestHandler } from 'express';

import getPublicUserKeys from '../../utils/user/getPublicUserKeys';
import { publicUsernameParamsSchema } from '../../validation/user/updateProfile';

const getPublicUserKeysRoute: RequestHandler = async (req, res) => {
  const parsedParams = publicUsernameParamsSchema.safeParse(req.params);

  if (!parsedParams.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid username',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedParams.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await getPublicUserKeys(parsedParams.data.username);

  if (!result.ok) {
    return res.status(404).j({
      status: 'error',
      message: 'Active public keys were not found',
      result: {
        code: result.reason === 'user_not_found' ? 'USER_NOT_FOUND' : 'ACTIVE_KEYS_NOT_FOUND',
      },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Active public keys retrieved',
    result: { user: result.user, keys: result.keys },
  });
};

export default getPublicUserKeysRoute;
