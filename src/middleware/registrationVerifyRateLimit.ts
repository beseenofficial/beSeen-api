import { rateLimit } from 'express-rate-limit';

const registrationVerifyRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    return res.status(429).j({
      status: 'error',
      message: 'Too many registration verification requests',
      result: {
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  },
});

export default registrationVerifyRateLimit;
