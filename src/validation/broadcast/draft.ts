import { z } from 'zod';

import {
  BROADCAST_RECIPIENT_PAGE_DEFAULT_LIMIT,
  BROADCAST_RECIPIENT_PAGE_MAX_LIMIT,
} from '../../constant/broadcast';

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Must be a MongoDB ObjectId');

const createBroadcastDraftBodySchema = z
  .object({
    clientBroadcastId: z.uuid().transform((value) => value.toLowerCase()),
  })
  .strict();

const broadcastDraftParamsSchema = z.object({
  draftId: objectIdSchema.transform((value) => value.toLowerCase()),
});

const broadcastRecipientPageQuerySchema = z.object({
  cursor: objectIdSchema.transform((value) => value.toLowerCase()).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(BROADCAST_RECIPIENT_PAGE_MAX_LIMIT)
    .default(BROADCAST_RECIPIENT_PAGE_DEFAULT_LIMIT),
});

type CreateBroadcastDraftBody = z.infer<typeof createBroadcastDraftBodySchema>;
type BroadcastRecipientPageQuery = z.infer<typeof broadcastRecipientPageQuerySchema>;

export {
  broadcastDraftParamsSchema,
  broadcastRecipientPageQuerySchema,
  createBroadcastDraftBodySchema,
};
export type { BroadcastRecipientPageQuery, CreateBroadcastDraftBody };
