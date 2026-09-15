import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import isPositiveU64String from '../utils/contract/isPositiveU64String';

interface IAuraFollow {
  follower: Types.ObjectId;
  subject: Types.ObjectId;
  firstContractTokenId: string;
  createdAt: Date;
  updatedAt: Date;
}

type AuraFollowDocument = HydratedDocument<IAuraFollow>;

const auraFollowSchema = new Schema<IAuraFollow>(
  {
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    subject: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    firstContractTokenId: {
      type: String,
      required: true,
      immutable: true,
      validate: {
        validator: isPositiveU64String,
        message: 'First Aura token ID must be a positive u64 integer',
      },
    },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

auraFollowSchema.index(
  { follower: 1, subject: 1 },
  { unique: true, name: 'aura_follows_follower_subject_unique' },
);
auraFollowSchema.index({ follower: 1, _id: -1 }, { name: 'aura_follows_follower_list' });
auraFollowSchema.index({ subject: 1, createdAt: -1 }, { name: 'aura_follows_subject_activity' });

const AuraFollow = model<IAuraFollow>('AuraFollow', auraFollowSchema);

export default AuraFollow;
export type { AuraFollowDocument, IAuraFollow };
