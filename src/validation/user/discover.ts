import { z } from 'zod';

import { USER_DISCOVER_DEFAULT_LIMIT, USER_DISCOVER_MAX_LIMIT } from '../../constant/user';
import { decodeDiscoverCursor } from '../../utils/discover/discoverCursor';

const discoverCursorSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .transform((value, context) => {
    const cursor = decodeDiscoverCursor(value);

    if (!cursor) {
      context.addIssue({ code: 'custom', message: 'Cursor is invalid' });

      return z.NEVER;
    }

    return cursor;
  });

const discoverUsersQuerySchema = z
  .object({
    cursor: discoverCursorSchema.optional(),
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
