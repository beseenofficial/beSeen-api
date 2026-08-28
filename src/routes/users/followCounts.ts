import type { RequestHandler } from 'express';

import getFollowCounts from '../../utils/token/getFollowCounts';
import { publicUsernameParamsSchema } from '../../validation/user/updateProfile';

const getFollowCountsRoute: RequestHandler = async (req, res) => {
  const params = publicUsernameParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid username',
      result: { code: 'VALIDATION_ERROR' },
    });
  }

  const result = await getFollowCounts(params.data.username);
  if (!result.ok) {
    return res.status(404).j({
      status: 'error',
      message: 'User was not found',
      result: { code: 'USER_NOT_FOUND' },
    });
  }

  return res.status(200).j({
    status: 'success',
    message: 'Follow counts retrieved',
    result: {
      user: result.user,
      followerCount: result.followerCount,
      followingCount: result.followingCount,
    },
  });
};

export default getFollowCountsRoute;
