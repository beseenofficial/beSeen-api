import { z } from 'zod';

import {
  MESSENGER_CONVERSATION_LIST_DEFAULT_LIMIT,
  MESSENGER_CONVERSATION_LIST_MAX_LIMIT,
} from '../../constant/messenger';

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Value must be a MongoDB ObjectId')
  .transform((value) => value.toLowerCase());

const conversationParamsSchema = z
  .object({
    conversationId: objectIdSchema,
  })
  .strict();

const conversationListQuerySchema = z
  .object({
    cursor: objectIdSchema.optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MESSENGER_CONVERSATION_LIST_MAX_LIMIT)
      .default(MESSENGER_CONVERSATION_LIST_DEFAULT_LIMIT),
  })
  .strict();

type ConversationListQuery = z.infer<typeof conversationListQuerySchema>;

export { conversationListQuerySchema, conversationParamsSchema };
export type { ConversationListQuery };
