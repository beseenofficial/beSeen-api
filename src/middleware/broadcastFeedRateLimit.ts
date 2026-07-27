import { rateLimit } from 'express-rate-limit';

const broadcastFeedRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many broadcast feed requests. Please try again shortly.',
    result: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

export default broadcastFeedRateLimit;
