import { rateLimit } from 'express-rate-limit';

const usernameAvailabilityRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many username availability requests. Please try again shortly.',
    result: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

export default usernameAvailabilityRateLimit;
