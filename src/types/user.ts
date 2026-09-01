import type { AuthenticatedUser, PublicUserProfile, UserVerification } from './auth';

interface UsernameAvailabilityResult {
  username: string;
  available: boolean;
  reason: UsernameUnavailabilityReason | null;
}

interface DiscoverUser {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  verification: UserVerification;
}

interface DiscoverUsersPage {
  users: DiscoverUser[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface UserActivityHeartbeat {
  creditedSeconds: number;
  lastActiveAt: Date;
  isOnline: boolean;
}

interface CurrentUserProfile extends AuthenticatedUser {
  demoUsdcBalance: string;
}

type RecordUserActivityResult =
  { ok: true; activity: UserActivityHeartbeat } | { ok: false; reason: 'account_unavailable' };

type UsernameUnavailabilityReason = 'invalid' | 'reserved' | 'taken';

type UpdateProfileFailureReason =
  'account_unavailable' | 'username_taken' | 'invalid_avatar' | 'avatar_storage_unavailable';

type UpdateCurrentUserResult =
  { ok: true; user: AuthenticatedUser } | { ok: false; reason: UpdateProfileFailureReason };

type GetCurrentUserResult =
  { ok: true; user: CurrentUserProfile } | { ok: false; reason: 'account_unavailable' };

type GetPublicProfileResult =
  { ok: true; user: PublicUserProfile } | { ok: false; reason: 'user_not_found' };

type GetPublicUserKeysResult =
  | {
      ok: true;
      user: { id: string; username: string };
      keys: {
        derivationVersion: number;
        signing: { algorithm: 'Ed25519'; publicKey: string };
        encryption: { algorithm: 'X25519'; publicKey: string };
      };
    }
  | { ok: false; reason: 'user_not_found' | 'active_keys_not_found' };

export type {
  DiscoverUser,
  DiscoverUsersPage,
  GetCurrentUserResult,
  GetPublicProfileResult,
  GetPublicUserKeysResult,
  UpdateCurrentUserResult,
  RecordUserActivityResult,
  UserActivityHeartbeat,
  CurrentUserProfile,
  UpdateProfileFailureReason,
  UsernameAvailabilityResult,
  UsernameUnavailabilityReason,
};
