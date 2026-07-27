import type { RequestHandler } from 'express';

const getHealthRoute: RequestHandler = (_req, res) => {
  return res.status(200).j({
    status: 'success',
    message: 'BeSeen API is healthy',
    result: {
      service: 'beseen-api',
      state: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
};

export default getHealthRoute;
