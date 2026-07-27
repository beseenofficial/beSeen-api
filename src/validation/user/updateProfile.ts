import { z } from 'zod';

import {
  creatorProfileSchema,
  creatorProfileUpdateSchema,
  nullableHttpUrlSchema,
  usernameSchema,
} from './profileFields';

const updateProfileBodySchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: z.string().trim().min(1).max(50).optional(),
    bio: z.string().trim().max(300).optional(),
    avatarUrl: nullableHttpUrlSchema.optional(),
    accountType: z.enum(['regular', 'creator']).optional(),
    creatorProfile: z.union([creatorProfileSchema, creatorProfileUpdateSchema]).optional(),
  })
  .strict()
  .superRefine((body, context) => {
    if (Object.keys(body).length === 0) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'Profile update cannot be empty',
      });
    }

    if (body.accountType === 'regular' && body.creatorProfile) {
      context.addIssue({
        code: 'custom',
        path: ['creatorProfile'],
        message: 'Creator profile is not allowed when switching to a regular account',
      });
    }
  });

const publicUsernameParamsSchema = z.object({ username: usernameSchema }).strict();

type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

export default updateProfileBodySchema;
export { publicUsernameParamsSchema };
export type { UpdateProfileBody };
