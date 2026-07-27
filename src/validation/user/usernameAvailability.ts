import { z } from 'zod';

const usernameAvailabilityQuerySchema = z
  .object({
    username: z.string().trim().min(1).max(100),
  })
  .strict();

type UsernameAvailabilityQuery = z.infer<typeof usernameAvailabilityQuerySchema>;

export default usernameAvailabilityQuerySchema;
export type { UsernameAvailabilityQuery };
