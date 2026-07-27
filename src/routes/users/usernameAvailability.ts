import type { RequestHandler } from 'express';

import checkUsernameAvailability from '../../utils/user/checkUsernameAvailability';
import usernameAvailabilityQuerySchema from '../../validation/user/usernameAvailability';

const getUsernameAvailabilityRoute: RequestHandler = async (req, res) => {
  const parsedQuery = usernameAvailabilityQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    return res.status(400).j({
      status: 'error',
      message: 'Invalid username availability request',
      result: {
        code: 'VALIDATION_ERROR',
        issues: parsedQuery.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  const result = await checkUsernameAvailability(parsedQuery.data.username);

  return res.status(200).j({
    status: 'success',
    message: result.available ? 'Username is available' : 'Username is unavailable',
    result,
  });
};

export default getUsernameAvailabilityRoute;
