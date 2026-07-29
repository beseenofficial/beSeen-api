import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

interface IUserToken {
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

type UserTokenDocument = HydratedDocument<IUserToken>;

const userTokenSchema = new Schema<IUserToken>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

userTokenSchema.index({ owner: 1 }, { unique: true, name: 'user_tokens_one_per_owner' });

const UserToken = model<IUserToken>('UserToken', userTokenSchema);

export default UserToken;
export type { IUserToken, UserTokenDocument };
