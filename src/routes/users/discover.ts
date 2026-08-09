import type { RequestHandler } from 'express';

import discoverUsers from '../../utils/user/discoverUsers';
import discoverUsersQuerySchema from '../../validation/user/discover';

const discoverUsersRoute: RequestHandler = async (req, res) => {
  const parsedQuery = discoverUsersQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid discover request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedQuery.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const page = await discoverUsers(parsedQuery.data);

  return res.status(200).j({
    status: 'success',
    message: 'Users discovered',
    result: page,
  });
};

export default discoverUsersRoute;
