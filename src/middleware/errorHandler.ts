import type { ErrorRequestHandler } from 'express';

import log from '../logger';

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  log.error(
    {
      error,
      method: req.method,
      path: req.originalUrl,
    },
    'Unhandled request error',
  );

  return res.status(500).j({
    status: 'error',
    message: 'Something went wrong',
    result: {},
  });
};

export default errorHandler;
