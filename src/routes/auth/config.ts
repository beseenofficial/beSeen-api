import type { RequestHandler } from 'express';

import getAuthClientConfig from '../../utils/auth/getAuthClientConfig';

const getAuthConfigRoute: RequestHandler = (_req, res) => {
  return res.status(200).j({
    status: 'success',
    message: 'Authentication client configuration retrieved',
    result: getAuthClientConfig(),
  });
};

export default getAuthConfigRoute;
