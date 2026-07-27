import { rateLimit } from 'express-rate-limit';

const broadcastCancelRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many broadcast cancellation requests. Please try again shortly.',
    result: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

export default broadcastCancelRateLimit;
