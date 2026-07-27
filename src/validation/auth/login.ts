import { z } from 'zod';

import isBase64Sep53Signature from '../../utils/auth/isBase64Sep53Signature';

const loginBodySchema = z
  .object({
    challengeId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Challenge ID must be a MongoDB ObjectId'),
    signature: z
      .string()
      .trim()
      .refine(isBase64Sep53Signature, 'Signature must be a canonical base64 SEP-53 signature'),
  })
  .strict();

type LoginBody = z.infer<typeof loginBodySchema>;

export default loginBodySchema;
export type { LoginBody };
