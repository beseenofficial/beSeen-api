import type { RequestHandler } from 'express';

const notFound: RequestHandler = (_req, res) => {
  return res.status(404).j({
    status: 'error',
    message: 'Route not found',
    result: {},
  });
};

export default notFound;
