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

export type { AuthenticatedCreatorProfile, AuthenticatedUser };
