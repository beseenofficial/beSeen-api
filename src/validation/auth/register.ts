import { z } from 'zod';

import { usernameSchema } from '../user/profileFields';
import isBase64PublicKey from '../../utils/auth/isBase64PublicKey';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress';

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
    keys: z
      .object({
        signing: z.object({ algorithm: z.literal('Ed25519'), publicKey: publicKeySchema }).strict(),
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
  .strip();

type RegisterBody = z.infer<typeof registerBodySchema>;

export default registerBodySchema;
export type { RegisterBody };
