import { z } from 'zod';

import { usernameSchema } from './profileFields';
import { USER_BIO_MAX_LENGTH } from '../../constant/user';

const bioSchema = z
  .string()
  .trim()
  .refine((value) => !/[\r\n]/u.test(value), 'Bio must be a single line')
  .refine(
    (value) => [...value].length <= USER_BIO_MAX_LENGTH,
    `Bio must contain at most ${USER_BIO_MAX_LENGTH} characters`,
  )
  .transform((value) => (value === '' ? null : value))
  .nullable();

const updateProfileBodySchema = z
  .object({
    username: usernameSchema.optional(),
    bio: bioSchema.optional(),
    removeAvatar: z.literal(true).optional(),
  })
  .strict();

const publicUsernameParamsSchema = z.object({ username: usernameSchema }).strict();

type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

export default updateProfileBodySchema;
export { publicUsernameParamsSchema };
export type { UpdateProfileBody };
