import { z } from 'zod';

import {
  BROADCAST_KEY_BATCH_MAX_ITEMS,
  BROADCAST_WRAPPED_KEY_BYTES,
} from '../../constant/broadcast';
import isCanonicalBase64 from '../../utils/crypto/isCanonicalBase64';

const recipientKeySchema = z
  .object({
    recipientId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Recipient ID must be a MongoDB ObjectId')
      .transform((value) => value.toLowerCase()),
    keyVersion: z.number().int().positive(),
    encryptedBroadcastKey: z.string().refine(
      (value) =>
        isCanonicalBase64(value, {
          minBytes: BROADCAST_WRAPPED_KEY_BYTES,
          maxBytes: BROADCAST_WRAPPED_KEY_BYTES,
        }),
      'Encrypted broadcast key must be a canonical base64 80-byte sealed-box ciphertext',
    ),
  })
  .strict();

const uploadBroadcastRecipientKeysBodySchema = z
  .object({
    keys: z.array(recipientKeySchema).min(1).max(BROADCAST_KEY_BATCH_MAX_ITEMS),
  })
  .strict()
  .superRefine((body, context) => {
    const seenRecipientIds = new Set<string>();

    body.keys.forEach((key, index) => {
      if (seenRecipientIds.has(key.recipientId)) {
        context.addIssue({
          code: 'custom',
          path: ['keys', index, 'recipientId'],
          message: 'Each recipient may appear only once per batch',
        });
      }

      seenRecipientIds.add(key.recipientId);
    });
  });

type UploadBroadcastRecipientKeysBody = z.infer<typeof uploadBroadcastRecipientKeysBodySchema>;

export default uploadBroadcastRecipientKeysBodySchema;
export type { UploadBroadcastRecipientKeysBody };
