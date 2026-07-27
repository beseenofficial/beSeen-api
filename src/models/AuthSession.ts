import { Schema, model } from 'mongoose';
import type { HydratedDocument, Types } from 'mongoose';

interface IAuthSession {
  user: Types.ObjectId;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type AuthSessionDocument = HydratedDocument<IAuthSession>;

const authSessionSchema = new Schema<IAuthSession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
      match: [/^[a-f0-9]{64}$/, 'Refresh token hash must be a SHA-256 hex value'],
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

authSessionSchema.index(
  { refreshTokenHash: 1 },
  { unique: true, name: 'auth_sessions_refresh_token_hash_unique' },
);
authSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'auth_sessions_expiry_ttl' },
);
authSessionSchema.index(
  { user: 1, revokedAt: 1, expiresAt: 1 },
  { name: 'auth_sessions_user_active' },
);

const AuthSession = model<IAuthSession>('AuthSession', authSessionSchema);

export default AuthSession;
export type { AuthSessionDocument, IAuthSession };
