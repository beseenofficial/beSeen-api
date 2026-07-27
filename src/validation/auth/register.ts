import { z } from 'zod';

import {
  MAX_CREATOR_CATEGORIES,
  MAX_CREATOR_CATEGORY_LENGTH,
  MAX_CREATOR_SKILLS,
  MAX_CREATOR_SKILL_LENGTH,
} from '../../constant/profile';
import { RESERVED_USERNAMES, USER_ACCOUNT_TYPES } from '../../constant/user';
import isBase64Sep53Signature from '../../utils/auth/isBase64Sep53Signature';
import isHttpUrl from '../../utils/profile/isHttpUrl';
import normalizeStringList from '../../utils/profile/normalizeStringList';

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

const nullableHttpUrlSchema = z
  .string()
  .trim()
  .max(2_048)
  .refine((value) => isHttpUrl(value), 'URL must use http or https')
  .nullable();

const creatorProfileSchema = z
  .object({
    headline: z.string().trim().min(1).max(100),
    categories: z
      .array(z.string().trim().min(1).max(MAX_CREATOR_CATEGORY_LENGTH))
      .min(1)
      .max(MAX_CREATOR_CATEGORIES)
      .transform(normalizeStringList),
    skills: z
      .array(z.string().trim().min(1).max(MAX_CREATOR_SKILL_LENGTH))
      .max(MAX_CREATOR_SKILLS)
      .transform(normalizeStringList)
      .default([]),
    websiteUrl: nullableHttpUrlSchema.optional().default(null),
    isAvailableForWork: z.boolean().optional().default(false),
  })
  .strict();

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
    registrationToken: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{43}$/, 'Registration token must be a 32-byte base64url value')
      .optional(),
    challengeId: z
      .string()
      .trim()
      .regex(/^[a-f\d]{24}$/i, 'Challenge ID must be a MongoDB ObjectId')
      .optional(),
    signature: z
      .string()
      .trim()
      .refine(isBase64Sep53Signature, 'Signature must be a canonical base64 SEP-53 signature')
      .optional(),
    profile: profileSchema,
  })
  .strict()
  .superRefine((body, context) => {
    const usesRegistrationToken = body.registrationToken !== undefined;
    const usesSignedChallenge = body.challengeId !== undefined || body.signature !== undefined;

    if (usesRegistrationToken === usesSignedChallenge) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'Provide either registrationToken or challengeId with signature',
      });
    }

    if (usesSignedChallenge && (!body.challengeId || !body.signature)) {
      context.addIssue({
        code: 'custom',
        path: body.challengeId ? ['signature'] : ['challengeId'],
        message: 'Challenge ID and signature must be provided together',
      });
    }
  });

type RegisterBody = z.infer<typeof registerBodySchema>;

export default registerBodySchema;
export type { RegisterBody };
