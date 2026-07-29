import type { RequestHandler } from 'express';

import getFollowerCount from '../../utils/token/getFollowerCount';
import { publicUsernameParamsSchema } from '../../validation/user/updateProfile';

const getFollowerCountRoute: RequestHandler = async (req, res) => {
  const params = publicUsernameParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid username',
      result: { code: 'VALIDATION_ERROR' },
    });
  }

  const result = await getFollowerCount(params.data.username);
  if (!result.ok) {
    return res.status(404).j({
      status: 'error',
      message: 'User was not found',
      result: { code: 'USER_NOT_FOUND' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Follower count retrieved',
    result: { user: result.user, followerCount: result.count },
  });
};

export default getFollowerCountRoute;
