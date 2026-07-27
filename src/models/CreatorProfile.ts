import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import {
  MAX_CREATOR_CATEGORIES,
  MAX_CREATOR_CATEGORY_LENGTH,
  MAX_CREATOR_SKILLS,
  MAX_CREATOR_SKILL_LENGTH,
} from '../constant/profile';
import isHttpUrl from '../utils/profile/isHttpUrl';
import normalizeStringList from '../utils/profile/normalizeStringList';

interface ICreatorProfile {
  user: Types.ObjectId;
  headline: string;
  categories: string[];
  skills: string[];
  websiteUrl: string | null;
  isAvailableForWork: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type CreatorProfileDocument = HydratedDocument<ICreatorProfile>;

const creatorProfileSchema = new Schema<ICreatorProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    categories: {
      type: [String],
      default: [],
      set: normalizeStringList,
      validate: {
        validator: (values: string[]) =>
          values.length <= MAX_CREATOR_CATEGORIES &&
          values.every((value) => value.length <= MAX_CREATOR_CATEGORY_LENGTH),
        message: `Creator categories must contain at most ${MAX_CREATOR_CATEGORIES} values of ${MAX_CREATOR_CATEGORY_LENGTH} characters`,
      },
    },
    skills: {
      type: [String],
      default: [],
      set: normalizeStringList,
      validate: {
        validator: (values: string[]) =>
          values.length <= MAX_CREATOR_SKILLS &&
          values.every((value) => value.length <= MAX_CREATOR_SKILL_LENGTH),
        message: `Creator skills must contain at most ${MAX_CREATOR_SKILLS} values of ${MAX_CREATOR_SKILL_LENGTH} characters`,
      },
    },
    websiteUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
      default: null,
      validate: {
        validator: isHttpUrl,
        message: 'Website URL must use http or https',
      },
    },
    isAvailableForWork: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

creatorProfileSchema.index({ user: 1 }, { unique: true, name: 'creator_profiles_user_unique' });
creatorProfileSchema.index(
  { categories: 1, isAvailableForWork: 1 },
  { name: 'creator_profiles_discovery' },
);

const CreatorProfile = model<ICreatorProfile>('CreatorProfile', creatorProfileSchema);

export default CreatorProfile;
export type { CreatorProfileDocument, ICreatorProfile };
