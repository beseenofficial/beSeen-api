interface AuthenticatedCreatorProfile {
  headline: string;
  categories: string[];
  skills: string[];
  websiteUrl: string | null;
  isAvailableForWork: boolean;
}

interface AuthenticatedUser {
  id: string;
  walletAddress: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  accountType: 'regular' | 'creator';
  creatorProfile: AuthenticatedCreatorProfile | null;
  createdAt: Date;
}

interface AuthRequestContext {
  userId: string;
  sessionId: string;
  role: UserRole;
  accountType: UserAccountType;
}

export type { AuthenticatedCreatorProfile, AuthenticatedUser, AuthRequestContext };
import type { UserAccountType, UserRole } from '../constant/user';
