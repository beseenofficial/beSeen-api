import { z } from 'zod';

import isHttpUrl from '../../utils/profile/isHttpUrl';
import { RESERVED_USERNAMES } from '../../constant/user';

const usernameSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(3)
      .max(30)
      .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and _')
      .refine(
        (value) => !RESERVED_USERNAMES.some((reserved) => reserved === value),
        'Username is reserved',
      ),
  );

const nullableAvatarSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine((value) => isHttpUrl(value), 'Avatar URL must use http or https')
  .nullable();

export { nullableAvatarSchema, usernameSchema };
