import { rateLimit } from 'express-rate-limit';

const refreshRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many session refresh attempts. Please try again shortly.',
    result: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

export default refreshRateLimit;
