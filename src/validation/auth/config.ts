import { z } from 'zod';

import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress';

const authConfigQuerySchema = z
  .object({
    walletAddress: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine(isValidStellarGAddress, 'Wallet address must be a valid Stellar G address'),
  })
  .strict();

type AuthConfigQuery = z.infer<typeof authConfigQuerySchema>;

export default authConfigQuerySchema;
export type { AuthConfigQuery };
