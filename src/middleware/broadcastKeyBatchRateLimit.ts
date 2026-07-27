import { rateLimit } from 'express-rate-limit';

const broadcastKeyBatchRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many encrypted-key batch requests. Please try again shortly.',
    result: { code: 'RATE_LIMIT_EXCEEDED' },
  },
});

export default broadcastKeyBatchRateLimit;
