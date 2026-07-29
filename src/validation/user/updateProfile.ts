import { z } from 'zod';

import { nullableAvatarSchema, usernameSchema } from './profileFields';

const updateProfileBodySchema = z
  .object({
    username: usernameSchema.optional(),
    avatar: nullableAvatarSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Profile update cannot be empty');

const publicUsernameParamsSchema = z.object({ username: usernameSchema }).strict();

type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

export default updateProfileBodySchema;
export { publicUsernameParamsSchema };
export type { UpdateProfileBody };
