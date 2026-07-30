import { z } from 'zod';

import { usernameSchema } from './profileFields';

const updateProfileBodySchema = z
  .object({
    username: usernameSchema.optional(),
    removeAvatar: z.literal(true).optional(),
  })
  .strict();

const publicUsernameParamsSchema = z.object({ username: usernameSchema }).strict();

type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

export default updateProfileBodySchema;
export { publicUsernameParamsSchema };
export type { UpdateProfileBody };
