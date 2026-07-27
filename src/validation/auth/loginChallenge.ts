import { z } from 'zod';

import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress';

const loginChallengeBodySchema = z
  .object({
    walletAddress: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine(isValidStellarGAddress, 'Wallet address must be a valid Stellar G address'),
  })
  .strict();

type LoginChallengeBody = z.infer<typeof loginChallengeBodySchema>;

export default loginChallengeBodySchema;
export type { LoginChallengeBody };
