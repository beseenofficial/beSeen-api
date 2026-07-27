import { z } from 'zod';

import isBase64Sep53Signature from '../../utils/auth/isBase64Sep53Signature';

const registrationVerifyBodySchema = z
  .object({
    challengeId: z
      .string()
      .trim()
      .regex(/^[a-fA-F0-9]{24}$/, 'Challenge ID must be a valid MongoDB ObjectId')
      .transform((value) => value.toLowerCase()),
    signature: z
      .string()
      .trim()
      .refine(isBase64Sep53Signature, 'Signature must be a canonical base64-encoded 64-byte value'),
  })
  .strict();

type RegistrationVerifyBody = z.infer<typeof registrationVerifyBodySchema>;

export default registrationVerifyBodySchema;
export type { RegistrationVerifyBody };
