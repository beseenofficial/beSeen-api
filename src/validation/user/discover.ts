import { z } from 'zod';

import { USER_DISCOVER_DEFAULT_LIMIT, USER_DISCOVER_MAX_LIMIT } from '../../constant/user';

const discoverUsersQuerySchema = z
  .object({
    cursor: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Cursor must be a MongoDB ObjectId')
      .transform((value) => value.toLowerCase())
      .optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(USER_DISCOVER_MAX_LIMIT)
      .default(USER_DISCOVER_DEFAULT_LIMIT),
  })
  .strict();

type DiscoverUsersQuery = z.infer<typeof discoverUsersQuerySchema>;

export default discoverUsersQuerySchema;
export type { DiscoverUsersQuery };
