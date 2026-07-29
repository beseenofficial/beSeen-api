import { z } from 'zod';

import { KEY_DERIVATION_VERSION } from '../../constant/auth';
import isBase64PublicKey from '../../utils/auth/isBase64PublicKey';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress';
import { nullableAvatarSchema, usernameSchema } from '../user/profileFields';

const publicKeySchema = z
  .string()
  .trim()
  .refine(isBase64PublicKey, 'Public key must be a canonical base64-encoded 32-byte key');

const registerBodySchema = z
  .object({
    walletAddress: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine(isValidStellarGAddress, 'Wallet address must be a valid Stellar G address'),
    username: usernameSchema,
    avatar: nullableAvatarSchema.optional().default(null),
    keys: z
      .object({
        derivationVersion: z.literal(KEY_DERIVATION_VERSION),
        signing: z
          .object({ algorithm: z.literal('Ed25519'), publicKey: publicKeySchema })
          .strict(),
        encryption: z
          .object({ algorithm: z.literal('X25519'), publicKey: publicKeySchema })
          .strict(),
      })
      .strict()
      .superRefine((keys, context) => {
        if (keys.signing.publicKey === keys.encryption.publicKey) {
          context.addIssue({
            code: 'custom',
            path: ['encryption', 'publicKey'],
            message: 'Signing and encryption public keys must be different',
          });
        }
      }),
  })
  .strict();

type RegisterBody = z.infer<typeof registerBodySchema>;

export default registerBodySchema;
export type { RegisterBody };
