import { z } from 'zod';

const bountyParamsSchema = z
  .object({
    bountyId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Value must be a MongoDB ObjectId')
      .transform((value) => value.toLowerCase()),
  })
  .strict();

export { bountyParamsSchema };
