import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

const MAX_CREATOR_CATEGORIES = 5;
const MAX_CREATOR_SKILLS = 20;

const normalizeStringList = (values: string[]): string[] => {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
};

const isHttpUrl = (value: string | null): boolean => {
  if (value === null) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

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
        validator: (values: string[]) => values.length <= MAX_CREATOR_CATEGORIES,
        message: `A creator can have at most ${MAX_CREATOR_CATEGORIES} categories`,
      },
    },
    skills: {
      type: [String],
      default: [],
      set: normalizeStringList,
      validate: {
        validator: (values: string[]) => values.length <= MAX_CREATOR_SKILLS,
        message: `A creator can have at most ${MAX_CREATOR_SKILLS} skills`,
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
export { MAX_CREATOR_CATEGORIES, MAX_CREATOR_SKILLS, isHttpUrl, normalizeStringList };
export type { CreatorProfileDocument, ICreatorProfile };
