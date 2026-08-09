import { z } from 'zod';

import isCanonicalBase64 from '../../utils/crypto/isCanonicalBase64';
import {
  BROADCAST_CONTENT_NONCE_BYTES,
  BROADCAST_MAX_CIPHERTEXT_BYTES,
  BROADCAST_MIN_CIPHERTEXT_BYTES,
  BROADCAST_WRAPPED_KEY_BYTES,
} from '../../constant/broadcast';

const canonicalBase64Bytes = (minBytes: number, maxBytes: number, message: string) =>
  z.string().refine((value) => isCanonicalBase64(value, { minBytes, maxBytes }), message);

const finalizeBroadcastBodySchema = z
  .object({
    contentCiphertext: canonicalBase64Bytes(
      BROADCAST_MIN_CIPHERTEXT_BYTES,
      BROADCAST_MAX_CIPHERTEXT_BYTES,
      'Content ciphertext must be canonical base64 within the payload size limit',
    ),
    contentNonce: canonicalBase64Bytes(
      BROADCAST_CONTENT_NONCE_BYTES,
      BROADCAST_CONTENT_NONCE_BYTES,
      'Content nonce must be canonical base64 containing exactly 24 bytes',
    ),
    creatorEncryptedBroadcastKey: canonicalBase64Bytes(
      BROADCAST_WRAPPED_KEY_BYTES,
      BROADCAST_WRAPPED_KEY_BYTES,
      'Creator encrypted broadcast key must be a canonical base64 80-byte sealed-box ciphertext',
    ),
    signature: canonicalBase64Bytes(
      64,
      64,
      'Signature must be a canonical base64 Ed25519 signature',
    ),
  })
  .strict();

type FinalizeBroadcastBody = z.infer<typeof finalizeBroadcastBodySchema>;

export default finalizeBroadcastBodySchema;
export type { FinalizeBroadcastBody };
