interface DiscoverRankingMetrics {
  hasAvatar: boolean;
  activeSeconds30d: number;
  activeDays30d: number;
  lastActiveAt: Date | null;
  followerCount: number;
  newFollowerCount30d: number;
  lastTokenPurchaseAt: Date | null;
  claimedBountyCount: number;
  claimedUsdcAmount: number;
  reciprocalConversationCount30d: number;
  lastReciprocalChatAt: Date | null;
  publishedBroadcastCount30d: number;
  lastPublishedBroadcastAt: Date | null;
  registeredAt: Date;
}

interface DiscoverRankingUser {
  id: string;
  registeredAt: Date;
  hasAvatar: boolean;
  lastActiveAt: Date | null;
}

interface DiscoverFollowerMetrics {
  userId: string;
  followerCount: number;
  newFollowerCount30d: number;
  lastTokenPurchaseAt: Date;
}

interface DiscoverBountyMetrics {
  userId: string;
  claimedBountyCount: number;
  claimedUsdcAmount: number;
}

interface DiscoverChatMetrics {
  userId: string;
  reciprocalConversationCount30d: number;
  lastReciprocalChatAt: Date;
}

interface DiscoverBroadcastMetrics {
  userId: string;
  publishedBroadcastCount30d: number;
  lastPublishedBroadcastAt: Date;
}

interface DiscoverActivityMetrics {
  userId: string;
  activeSeconds30d: number;
  activeDays30d: number;
}

export type {
  DiscoverBountyMetrics,
  DiscoverActivityMetrics,
  DiscoverBroadcastMetrics,
  DiscoverChatMetrics,
  DiscoverFollowerMetrics,
  DiscoverRankingMetrics,
  DiscoverRankingUser,
};
