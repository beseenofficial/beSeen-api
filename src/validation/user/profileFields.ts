import { z } from 'zod';

import {
  MAX_CREATOR_CATEGORIES,
  MAX_CREATOR_CATEGORY_LENGTH,
  MAX_CREATOR_SKILLS,
  MAX_CREATOR_SKILL_LENGTH,
} from '../../constant/profile';
import { RESERVED_USERNAMES } from '../../constant/user';
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

const creatorProfileUpdateSchema = z
  .object({
    headline: z.string().trim().min(1).max(100).optional(),
    categories: z
      .array(z.string().trim().min(1).max(MAX_CREATOR_CATEGORY_LENGTH))
      .min(1)
      .max(MAX_CREATOR_CATEGORIES)
      .transform(normalizeStringList)
      .optional(),
    skills: z
      .array(z.string().trim().min(1).max(MAX_CREATOR_SKILL_LENGTH))
      .max(MAX_CREATOR_SKILLS)
      .transform(normalizeStringList)
      .optional(),
    websiteUrl: nullableHttpUrlSchema.optional(),
    isAvailableForWork: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Creator profile update cannot be empty');

export { creatorProfileSchema, creatorProfileUpdateSchema, nullableHttpUrlSchema, usernameSchema };
