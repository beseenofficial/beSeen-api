import { z } from 'zod';

import isCanonicalBase64 from '../../utils/crypto/isCanonicalBase64';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress';

const loginBodySchema = z
  .object({
    walletAddress: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine(isValidStellarGAddress, 'Wallet address must be a valid Stellar G address'),
    requestId: z.uuid().transform((value) => value.toLowerCase()),
    issuedAt: z.iso.datetime().transform((value) => new Date(value).toISOString()),
    signature: z
      .string()
      .refine(
        (value) => isCanonicalBase64(value, { minBytes: 64, maxBytes: 64 }),
        'Signature must be a canonical base64 Ed25519 signature',
      ),
  })
  .strict();

type LoginBody = z.infer<typeof loginBodySchema>;

export default loginBodySchema;
export type { LoginBody };
