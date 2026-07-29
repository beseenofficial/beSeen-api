import type { UserRole } from '../constant/user';

interface AuthenticatedUser {
  id: string;
  username: string;
  avatar: string | null;
  createdAt: Date;
}

interface AuthRequestContext {
  userId: string;
  sessionId: string;
  role: UserRole;
}

type PublicUserProfile = AuthenticatedUser;

export type { AuthenticatedUser, AuthRequestContext, PublicUserProfile };
