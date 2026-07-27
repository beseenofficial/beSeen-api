import { Schema, model } from 'mongoose';
import type { HydratedDocument } from 'mongoose';

import { USER_ACCOUNT_TYPES, USER_ROLES, USER_STATUSES } from '../constant/user';
import type { UserAccountType, UserRole, UserStatus } from '../constant/user';

const STELLAR_G_ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;

interface IUser {
  walletAddress: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  accountType: UserAccountType;
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
      match: [STELLAR_G_ADDRESS_PATTERN, 'Wallet address must be a Stellar G address'],
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
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 50,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
      default: null,
    },
    accountType: {
      type: String,
      enum: USER_ACCOUNT_TYPES,
      default: 'regular',
      required: true,
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
userSchema.index({ accountType: 1, status: 1 }, { name: 'users_account_type_status' });

const User = model<IUser>('User', userSchema);

export default User;
export { STELLAR_G_ADDRESS_PATTERN, USERNAME_PATTERN };
export type { IUser, UserDocument };
