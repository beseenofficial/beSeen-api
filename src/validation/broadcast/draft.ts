import { z } from 'zod';

import {
  BROADCAST_DRAFT_LIST_DEFAULT_LIMIT,
  BROADCAST_DRAFT_LIST_MAX_LIMIT,
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

const broadcastRecipientPageQuerySchema = z
  .object({
    cursor: objectIdSchema.transform((value) => value.toLowerCase()).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(BROADCAST_RECIPIENT_PAGE_MAX_LIMIT)
      .default(BROADCAST_RECIPIENT_PAGE_DEFAULT_LIMIT),
  })
  .strict();

const broadcastDraftListQuerySchema = z
  .object({
    cursor: objectIdSchema.transform((value) => value.toLowerCase()).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(BROADCAST_DRAFT_LIST_MAX_LIMIT)
      .default(BROADCAST_DRAFT_LIST_DEFAULT_LIMIT),
  })
  .strict();

type CreateBroadcastDraftBody = z.infer<typeof createBroadcastDraftBodySchema>;
type BroadcastRecipientPageQuery = z.infer<typeof broadcastRecipientPageQuerySchema>;
type BroadcastDraftListQuery = z.infer<typeof broadcastDraftListQuerySchema>;

export {
  broadcastDraftParamsSchema,
  broadcastDraftListQuerySchema,
  broadcastRecipientPageQuerySchema,
  createBroadcastDraftBodySchema,
};
export type { BroadcastDraftListQuery, BroadcastRecipientPageQuery, CreateBroadcastDraftBody };
