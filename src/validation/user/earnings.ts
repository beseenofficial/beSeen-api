import { z } from 'zod';

const earningsQuerySchema = z
  .object({
    before: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'before must be a MongoDB object ID')
      .optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

type EarningsQuery = z.infer<typeof earningsQuerySchema>;

export default earningsQuerySchema;
export type { EarningsQuery };
