import type { Types } from 'mongoose';

import type { UserRole } from '../constant/user';

interface AuthenticatedUser {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
}

interface AuthRequestContext {
  userId: string;
  sessionId: string;
  role: UserRole;
}

interface PublicUserProfile extends AuthenticatedUser {
  broadcastCount: number;
  sentMessageCount: number;
  receivedMessageCount: number;
  messageCount: number;
}

interface SessionUser {
  id: Types.ObjectId;
  role: UserRole;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshTokenExpiresAt: Date;
}

interface LoginProofMessageInput {
  walletAddress: string;
  requestId: string;
  issuedAt: string;
}

interface AccessTokenUser {
  id: Types.ObjectId;
  role: UserRole;
}

type LoginFailureReason =
  'proof_expired' | 'proof_replayed' | 'invalid_signature' | 'account_unavailable';

type LoginUserResult =
  | { ok: true; user: AuthenticatedUser; auth: AuthTokens }
  | { ok: false; reason: LoginFailureReason };

type RegistrationFailureReason =
  | 'username_taken'
  | 'wallet_already_registered'
  | 'public_key_already_registered'
  | 'wallet_not_verified_by_blux'
  | 'blux_verification_unavailable'
  | 'invalid_avatar'
  | 'avatar_storage_unavailable';

type RegisterUserResult =
  | { ok: true; user: AuthenticatedUser; auth: AuthTokens }
  | { ok: false; reason: RegistrationFailureReason };

type RefreshAuthSessionResult =
  { ok: true; auth: AuthTokens } | { ok: false; reason: 'refresh_token_invalid' };

export type {
  AccessTokenUser,
  AuthenticatedUser,
  AuthRequestContext,
  AuthTokens,
  LoginFailureReason,
  LoginProofMessageInput,
  LoginUserResult,
  PublicUserProfile,
  RefreshAuthSessionResult,
  RegisterUserResult,
  RegistrationFailureReason,
  SessionUser,
};
