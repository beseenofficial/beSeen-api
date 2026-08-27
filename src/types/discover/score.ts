interface DiscoverScoreBreakdown {
  followers: number;
  tokenMomentum: number;
  claimedBounties: number;
  chatQuality: number;
  broadcastActivity: number;
  accountAge: number;
  profileCompleteness: number;
  onlineActivity: number;
  newUserBoost: number;
}

interface CalculatedDiscoverScore {
  score: number;
  breakdown: DiscoverScoreBreakdown;
}

interface DiscoverRankingRunResult {
  processedUsers: number;
  matchedUsers: number;
  modifiedUsers: number;
  calculatedAt: Date;
  durationMs: number;
}

export type { CalculatedDiscoverScore, DiscoverRankingRunResult, DiscoverScoreBreakdown };
