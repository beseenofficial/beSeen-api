import { z } from 'zod';

import { isCanonicalBase64Xdr } from '../../utils/stellar/sep10Challenge';

const loginBodySchema = z
  .object({
    challengeId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Challenge ID must be a MongoDB ObjectId'),
    signedTransactionXdr: z
      .string()
      .min(1)
      .max(16_384)
      .refine(isCanonicalBase64Xdr, 'Signed transaction must be canonical base64 XDR'),
  })
  .strict();

type LoginBody = z.infer<typeof loginBodySchema>;

export default loginBodySchema;
export type { LoginBody };
