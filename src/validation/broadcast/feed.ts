import { z } from 'zod';

import { BROADCAST_FEED_DEFAULT_LIMIT, BROADCAST_FEED_MAX_LIMIT } from '../../constant/broadcast';

const broadcastFeedQuerySchema = z
  .object({
    view: z.enum(['received', 'sent']).default('received'),
    cursor: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Cursor must be a MongoDB ObjectId')
      .transform((value) => value.toLowerCase())
      .optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(BROADCAST_FEED_MAX_LIMIT)
      .default(BROADCAST_FEED_DEFAULT_LIMIT),
  })
  .strict();

type BroadcastFeedQuery = z.infer<typeof broadcastFeedQuerySchema>;

export default broadcastFeedQuerySchema;
export type { BroadcastFeedQuery };
