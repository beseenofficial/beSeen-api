import { rateLimit } from 'express-rate-limit';

const registrationRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    return res.status(429).j({
      status: 'error',
      message: 'Too many registration requests',
      result: {
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

export default registrationRateLimit;
