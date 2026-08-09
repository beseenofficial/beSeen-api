import { z } from 'zod';

import {
  MESSENGER_MESSAGE_HISTORY_DEFAULT_LIMIT,
  MESSENGER_MESSAGE_HISTORY_MAX_LIMIT,
} from '../../constant/messenger';

const messageHistoryQuerySchema = z
  .object({
    beforeSequence: z.coerce.number().int().min(2).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MESSENGER_MESSAGE_HISTORY_MAX_LIMIT)
      .default(MESSENGER_MESSAGE_HISTORY_DEFAULT_LIMIT),
  })
  .strict();

type MessageHistoryQuery = z.infer<typeof messageHistoryQuerySchema>;

export default messageHistoryQuerySchema;
export type { MessageHistoryQuery };
