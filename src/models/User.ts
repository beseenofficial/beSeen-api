import { Schema, model } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { USER_ROLES, USER_STATUSES } from '../constant/user';
import type { UserRole, UserStatus } from '../constant/user';
import isValidStellarGAddress from '../utils/stellar/isValidStellarGAddress';

const USERNAME_PATTERN = /^[a-z0-9_]+$/;

interface IUser {
  walletAddress: string;
  username: string;
  avatar: string | null;
  avatarObjectKey: string | null;
  role: UserRole;
  status: UserStatus;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    walletAddress: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: isValidStellarGAddress,
        message: 'Wallet address must be a valid Stellar G address',
      },
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [USERNAME_PATTERN, 'Username can only contain lowercase letters, numbers, and _'],
    },
    avatar: {
      type: String,
      trim: true,
      maxlength: 2_048,
      default: null,
    },
    avatarObjectKey: {
      type: String,
      trim: true,
      maxlength: 1_024,
      default: null,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'user',
      required: true,
    },
    status: {
      type: String,
      enum: USER_STATUSES,
      default: 'active',
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ walletAddress: 1 }, { unique: true, name: 'users_wallet_address_unique' });
userSchema.index({ username: 1 }, { unique: true, name: 'users_username_unique' });
userSchema.index({ status: 1, _id: 1 }, { name: 'users_status_id' });

const User = model<IUser>('User', userSchema);

export default User;
export { USERNAME_PATTERN };
export type { IUser, UserDocument };
