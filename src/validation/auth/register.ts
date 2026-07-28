import { z } from 'zod';

import { USER_ACCOUNT_TYPES } from '../../constant/user';
import { isCanonicalBase64Xdr } from '../../utils/stellar/sep10Challenge';
import { creatorProfileSchema, nullableHttpUrlSchema, usernameSchema } from '../user/profileFields';

const profileSchema = z
  .object({
    username: usernameSchema,
    displayName: z.string().trim().min(1).max(50),
    bio: z.string().trim().max(300).optional().default(''),
    avatarUrl: nullableHttpUrlSchema.optional().default(null),
    accountType: z.enum(USER_ACCOUNT_TYPES),
    creatorProfile: creatorProfileSchema.optional(),
  })
  .strict()
  .superRefine((profile, context) => {
    if (profile.accountType === 'creator' && !profile.creatorProfile) {
      context.addIssue({
        code: 'custom',
        path: ['creatorProfile'],
        message: 'Creator profile is required for creator accounts',
      });
    }

    if (profile.accountType === 'regular' && profile.creatorProfile) {
      context.addIssue({
        code: 'custom',
        path: ['creatorProfile'],
        message: 'Creator profile is only allowed for creator accounts',
      });
    }
  });

const registerBodySchema = z
  .object({
    challengeId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Challenge ID must be a MongoDB ObjectId'),
    signedTransactionXdr: z
      .string()
      .min(1)
      .max(16_384)
      .refine(isCanonicalBase64Xdr, 'Signed transaction must be canonical base64 XDR'),
    profile: profileSchema,
  })
  .strict();

type RegisterBody = z.infer<typeof registerBodySchema>;

export default registerBodySchema;
export type { RegisterBody };
