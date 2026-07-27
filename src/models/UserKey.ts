import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

import { KEY_DERIVATION_VERSION, USER_KEY_STATUSES } from '../constant/auth';
import type { UserKeyStatus } from '../constant/auth';
import isBase64PublicKey from '../utils/auth/isBase64PublicKey';

interface IUserKey {
  user: Types.ObjectId;
  derivationVersion: number;
  signingPublicKey: string;
  encryptionPublicKey: string;
  status: UserKeyStatus;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type UserKeyDocument = HydratedDocument<IUserKey>;

const publicKeyValidation = {
  validator: isBase64PublicKey,
  message: 'Public key must be a canonical base64-encoded 32-byte key',
};

const userKeySchema = new Schema<IUserKey>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    derivationVersion: {
      type: Number,
      required: true,
      min: 1,
      default: KEY_DERIVATION_VERSION,
    },
    signingPublicKey: {
      type: String,
      required: true,
      trim: true,
      validate: publicKeyValidation,
    },
    encryptionPublicKey: {
      type: String,
      required: true,
      trim: true,
      validate: publicKeyValidation,
    },
    status: {
      type: String,
      enum: USER_KEY_STATUSES,
      default: 'active',
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userKeySchema.index(
  { user: 1, derivationVersion: 1 },
  { unique: true, name: 'user_keys_user_derivation_version_unique' },
);
userKeySchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'user_keys_one_active_per_user',
  },
);
userKeySchema.index(
  { signingPublicKey: 1 },
  { unique: true, name: 'user_keys_signing_public_key_unique' },
);
userKeySchema.index(
  { encryptionPublicKey: 1 },
  { unique: true, name: 'user_keys_encryption_public_key_unique' },
);

const UserKey = model<IUserKey>('UserKey', userKeySchema);

export default UserKey;
export type { IUserKey, UserKeyDocument };
