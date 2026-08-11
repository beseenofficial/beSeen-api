import { describe, expect, it } from 'vitest';

import type { DiscoverRankingMetrics } from '../../src/types/discover';
import calculateDiscoverScore from '../../src/utils/discover/calculateDiscoverScore';

const NOW = new Date('2026-08-11T12:00:00.000Z');

const metrics = (overrides: Partial<DiscoverRankingMetrics> = {}): DiscoverRankingMetrics => ({
  followerCount: 0,
  newFollowerCount30d: 0,
  lastTokenPurchaseAt: null,
  claimedBountyCount: 0,
  claimedUsdcAmount: 0,
  reciprocalConversationCount30d: 0,
  lastReciprocalChatAt: null,
  publishedBroadcastCount30d: 0,
  lastPublishedBroadcastAt: null,
  registeredAt: new Date('2026-07-01T12:00:00.000Z'),
  ...overrides,
});

describe('calculateDiscoverScore', () => {
  it('calculates every approved score component', () => {
    const result = calculateDiscoverScore(
      metrics({
        followerCount: 1_000,
        newFollowerCount30d: 100,
        lastTokenPurchaseAt: NOW,
        claimedBountyCount: 50,
        claimedUsdcAmount: 1_000,
        reciprocalConversationCount30d: 30,
        lastReciprocalChatAt: NOW,
        publishedBroadcastCount30d: 20,
        lastPublishedBroadcastAt: NOW,
      }),
      NOW,
    );

    expect(result).toEqual({
      score: 100,
      breakdown: {
        followers: 30,
        tokenMomentum: 20,
        claimedBounties: 15,
        chatQuality: 15,
        broadcastActivity: 15,
        accountAge: 5,
        newUserBoost: 0,
      },
    });
  });

  it('applies seven-day half-life to recent activity', () => {
    const sevenDaysAgo = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1_000);

    const result = calculateDiscoverScore(
      metrics({
        lastTokenPurchaseAt: sevenDaysAgo,
        lastReciprocalChatAt: sevenDaysAgo,
        lastPublishedBroadcastAt: sevenDaysAgo,
      }),
      NOW,
    );

    expect(result.breakdown.tokenMomentum).toBe(4);
    expect(result.breakdown.chatQuality).toBe(2.25);
    expect(result.breakdown.broadcastActivity).toBe(3);
  });

  it('caps volume metrics and the final score', () => {
    const result = calculateDiscoverScore(
      metrics({
        followerCount: 1_000_000,
        newFollowerCount30d: 100_000,
        lastTokenPurchaseAt: NOW,
        claimedBountyCount: 100_000,
        claimedUsdcAmount: 1_000_000,
        reciprocalConversationCount30d: 100_000,
        lastReciprocalChatAt: NOW,
        publishedBroadcastCount30d: 100_000,
        lastPublishedBroadcastAt: NOW,
      }),
      NOW,
    );

    expect(result.score).toBe(100);
    expect(result.breakdown.followers).toBe(30);
    expect(result.breakdown.claimedBounties).toBe(15);
  });

  it('gives a temporary boost to a new user without rewarding future dates', () => {
    const result = calculateDiscoverScore(
      metrics({ registeredAt: new Date('2026-08-12T12:00:00.000Z') }),
      NOW,
    );

    expect(result.breakdown.accountAge).toBe(0);
    expect(result.breakdown.newUserBoost).toBe(5);
    expect(result.score).toBe(5);
  });
});
