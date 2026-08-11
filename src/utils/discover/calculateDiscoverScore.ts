import type { CalculatedDiscoverScore, DiscoverRankingMetrics } from '../../types/discover';
import {
  DISCOVER_ACCOUNT_AGE_WEIGHT,
  DISCOVER_ACCOUNT_MATURITY_DAYS,
  DISCOVER_CLAIMED_BOUNTY_COUNT_CAP,
  DISCOVER_CLAIMED_BOUNTY_COUNT_WEIGHT,
  DISCOVER_CLAIMED_USDC_AMOUNT_CAP,
  DISCOVER_CLAIMED_USDC_AMOUNT_WEIGHT,
  DISCOVER_FOLLOWER_CAP,
  DISCOVER_FOLLOWER_WEIGHT,
  DISCOVER_LAST_PUBLISHED_BROADCAST_WEIGHT,
  DISCOVER_LAST_RECIPROCAL_CHAT_WEIGHT,
  DISCOVER_LAST_TOKEN_PURCHASE_WEIGHT,
  DISCOVER_NEW_USER_BOOSTS,
  DISCOVER_PUBLISHED_BROADCAST_COUNT_CAP,
  DISCOVER_PUBLISHED_BROADCAST_COUNT_WEIGHT,
  DISCOVER_RECENCY_HALF_LIFE_DAYS,
  DISCOVER_RECENT_FOLLOWER_CAP,
  DISCOVER_RECENT_FOLLOWER_WEIGHT,
  DISCOVER_RECIPROCAL_CHAT_COUNT_CAP,
  DISCOVER_RECIPROCAL_CHAT_COUNT_WEIGHT,
} from '../../constant/discover';
import {
  calculateAgeDays,
  calculateRecency,
  clampUnit,
  normalizeLogarithmically,
} from './normalizeScore';

const roundScore = (value: number): number => Math.round(value * 100) / 100;

const calculateNewUserBoost = (ageDays: number): number => {
  const matchingBoost = DISCOVER_NEW_USER_BOOSTS.find(
    ({ maximumAgeDays }) => ageDays < maximumAgeDays,
  );

  return matchingBoost?.boost ?? 0;
};

const calculateDiscoverScore = (
  metrics: DiscoverRankingMetrics,
  now: Date,
): CalculatedDiscoverScore => {
  const followers =
    DISCOVER_FOLLOWER_WEIGHT *
    normalizeLogarithmically(metrics.followerCount, DISCOVER_FOLLOWER_CAP);

  const tokenMomentum =
    DISCOVER_RECENT_FOLLOWER_WEIGHT *
      normalizeLogarithmically(metrics.newFollowerCount30d, DISCOVER_RECENT_FOLLOWER_CAP) +
    DISCOVER_LAST_TOKEN_PURCHASE_WEIGHT *
      calculateRecency(metrics.lastTokenPurchaseAt, now, DISCOVER_RECENCY_HALF_LIFE_DAYS);

  const claimedBounties =
    DISCOVER_CLAIMED_BOUNTY_COUNT_WEIGHT *
      normalizeLogarithmically(metrics.claimedBountyCount, DISCOVER_CLAIMED_BOUNTY_COUNT_CAP) +
    DISCOVER_CLAIMED_USDC_AMOUNT_WEIGHT *
      normalizeLogarithmically(metrics.claimedUsdcAmount, DISCOVER_CLAIMED_USDC_AMOUNT_CAP);

  const chatQuality =
    DISCOVER_RECIPROCAL_CHAT_COUNT_WEIGHT *
      normalizeLogarithmically(
        metrics.reciprocalConversationCount30d,
        DISCOVER_RECIPROCAL_CHAT_COUNT_CAP,
      ) +
    DISCOVER_LAST_RECIPROCAL_CHAT_WEIGHT *
      calculateRecency(metrics.lastReciprocalChatAt, now, DISCOVER_RECENCY_HALF_LIFE_DAYS);

  const broadcastActivity =
    DISCOVER_PUBLISHED_BROADCAST_COUNT_WEIGHT *
      normalizeLogarithmically(
        metrics.publishedBroadcastCount30d,
        DISCOVER_PUBLISHED_BROADCAST_COUNT_CAP,
      ) +
    DISCOVER_LAST_PUBLISHED_BROADCAST_WEIGHT *
      calculateRecency(metrics.lastPublishedBroadcastAt, now, DISCOVER_RECENCY_HALF_LIFE_DAYS);

  const ageDays = calculateAgeDays(metrics.registeredAt, now);

  const accountAge =
    DISCOVER_ACCOUNT_AGE_WEIGHT * clampUnit(ageDays / DISCOVER_ACCOUNT_MATURITY_DAYS);

  const newUserBoost = calculateNewUserBoost(ageDays);

  const breakdown = {
    followers: roundScore(followers),
    tokenMomentum: roundScore(tokenMomentum),
    claimedBounties: roundScore(claimedBounties),
    chatQuality: roundScore(chatQuality),
    broadcastActivity: roundScore(broadcastActivity),
    accountAge: roundScore(accountAge),
    newUserBoost,
  };

  const score = roundScore(
    Math.min(
      100,
      followers +
        tokenMomentum +
        claimedBounties +
        chatQuality +
        broadcastActivity +
        accountAge +
        newUserBoost,
    ),
  );

  return { score, breakdown };
};

export default calculateDiscoverScore;
