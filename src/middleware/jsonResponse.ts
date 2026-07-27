import type { RequestHandler } from 'express';

const jsonResponse: RequestHandler = (_req, res, next) => {
  res.j = (body) => res.json(body);
  next();
};

export default jsonResponse;
