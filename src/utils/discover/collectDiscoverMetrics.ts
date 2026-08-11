import type { Types } from 'mongoose';

import collectChatMetrics from './metrics/collectChatMetrics';
import collectBountyMetrics from './metrics/collectBountyMetrics';
import collectFollowerMetrics from './metrics/collectFollowerMetrics';
import { DISCOVER_ACTIVITY_WINDOW_DAYS } from '../../constant/discover';
import collectBroadcastMetrics from './metrics/collectBroadcastMetrics';
import type { DiscoverRankingMetrics, DiscoverRankingUser } from '../../types/discover';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

const createEmptyMetrics = (user: DiscoverRankingUser): DiscoverRankingMetrics => ({
  followerCount: 0,
  newFollowerCount30d: 0,
  lastTokenPurchaseAt: null,
  claimedBountyCount: 0,
  claimedUsdcAmount: 0,
  reciprocalConversationCount30d: 0,
  lastReciprocalChatAt: null,
  publishedBroadcastCount30d: 0,
  lastPublishedBroadcastAt: null,
  registeredAt: user.registeredAt,
});

const collectDiscoverMetrics = async (
  users: DiscoverRankingUser[],
  userIds: Types.ObjectId[],
  now: Date,
): Promise<Map<string, DiscoverRankingMetrics>> => {
  const metricsByUserId = new Map(users.map((user) => [user.id, createEmptyMetrics(user)]));

  if (users.length === 0) {
    return metricsByUserId;
  }

  const activityCutoff = new Date(
    now.getTime() - DISCOVER_ACTIVITY_WINDOW_DAYS * MILLISECONDS_PER_DAY,
  );

  const [followers, bounties, chats, broadcasts] = await Promise.all([
    collectFollowerMetrics(userIds, activityCutoff),
    collectBountyMetrics(userIds),
    collectChatMetrics(userIds, activityCutoff),
    collectBroadcastMetrics(userIds, activityCutoff),
  ]);

  for (const record of followers) {
    const metrics = metricsByUserId.get(record.userId);

    if (metrics) {
      metrics.followerCount = record.followerCount;
      metrics.newFollowerCount30d = record.newFollowerCount30d;
      metrics.lastTokenPurchaseAt = record.lastTokenPurchaseAt;
    }
  }

  for (const record of bounties) {
    const metrics = metricsByUserId.get(record.userId);

    if (metrics) {
      metrics.claimedBountyCount = record.claimedBountyCount;
      metrics.claimedUsdcAmount = record.claimedUsdcAmount;
    }
  }

  for (const record of chats) {
    const metrics = metricsByUserId.get(record.userId);

    if (metrics) {
      metrics.reciprocalConversationCount30d = record.reciprocalConversationCount30d;
      metrics.lastReciprocalChatAt = record.lastReciprocalChatAt;
    }
  }

  for (const record of broadcasts) {
    const metrics = metricsByUserId.get(record.userId);

    if (metrics) {
      metrics.publishedBroadcastCount30d = record.publishedBroadcastCount30d;
      metrics.lastPublishedBroadcastAt = record.lastPublishedBroadcastAt;
    }
  }

  return metricsByUserId;
};

export default collectDiscoverMetrics;
