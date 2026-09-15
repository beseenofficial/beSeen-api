import { z } from 'zod';

import isPositiveU64String from '../../utils/contract/isPositiveU64String';

const registerAuraPurchaseBodySchema = z
  .object({
    tokenId: z.string().refine(isPositiveU64String, 'tokenId must be a positive u64 integer'),
    buyerAddress: z.string().regex(/^G[A-Z2-7]{55}$/),
    subjectAddress: z.string().regex(/^G[A-Z2-7]{55}$/),
    transactionHash: z
      .string()
      .regex(/^[a-fA-F\d]{64}$/)
      .transform((value) => value.toLowerCase()),
  })
  .strict();

type RegisterAuraPurchaseBody = z.infer<typeof registerAuraPurchaseBodySchema>;

export default registerAuraPurchaseBodySchema;
export type { RegisterAuraPurchaseBody };
