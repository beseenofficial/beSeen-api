import { z } from 'zod';

import {
  MESSENGER_CONTENT_NONCE_BYTES,
  MESSENGER_MAX_CIPHERTEXT_BYTES,
  MESSENGER_MIN_CIPHERTEXT_BYTES,
  MESSENGER_WRAPPED_KEY_BYTES,
} from '../../constant/messenger';
import isCanonicalBase64 from '../../utils/crypto/isCanonicalBase64';

const canonicalBase64Bytes = (minBytes: number, maxBytes: number, message: string) =>
  z.string().refine((value) => isCanonicalBase64(value, { minBytes, maxBytes }), message);

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Reply message ID must be a MongoDB ObjectId')
  .transform((value) => value.toLowerCase());

const sendMessageBodySchema = z
  .object({
    clientMessageId: z.uuid().transform((value) => value.toLowerCase()),
    contentCiphertext: canonicalBase64Bytes(
      MESSENGER_MIN_CIPHERTEXT_BYTES,
      MESSENGER_MAX_CIPHERTEXT_BYTES,
      'Content ciphertext must be canonical base64 within the payload size limit',
    ),
    contentNonce: canonicalBase64Bytes(
      MESSENGER_CONTENT_NONCE_BYTES,
      MESSENGER_CONTENT_NONCE_BYTES,
      'Content nonce must be canonical base64 containing exactly 24 bytes',
    ),
    senderEncryptedMessageKey: canonicalBase64Bytes(
      MESSENGER_WRAPPED_KEY_BYTES,
      MESSENGER_WRAPPED_KEY_BYTES,
      'Sender encrypted message key must be a canonical base64 80-byte sealed-box ciphertext',
    ),
    recipientEncryptedMessageKey: canonicalBase64Bytes(
      MESSENGER_WRAPPED_KEY_BYTES,
      MESSENGER_WRAPPED_KEY_BYTES,
      'Recipient encrypted message key must be a canonical base64 80-byte sealed-box ciphertext',
    ),
    replyToMessageId: objectIdSchema.nullish().transform((value) => value ?? null),
    signature: canonicalBase64Bytes(
      64,
      64,
      'Signature must be a canonical base64 Ed25519 signature',
    ),
  })
  .strict();

type SendMessageBody = z.infer<typeof sendMessageBodySchema>;

export default sendMessageBodySchema;
export type { SendMessageBody };
