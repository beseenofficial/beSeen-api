import User from '../../models/User';
import type { DiscoverRankingRunResult, DiscoverRankingUser } from '../../types/discover';
import { DISCOVER_RANKING_BATCH_SIZE, DISCOVER_SCORE_VERSION } from '../../constant/discover';
import calculateDiscoverScore from './calculateDiscoverScore';
import collectDiscoverMetrics from './collectDiscoverMetrics';

const recalculateDiscoverRankings = async (
  calculatedAt = new Date(),
): Promise<DiscoverRankingRunResult> => {
  const startedAt = Date.now();

  const users = await User.find({ status: 'active', deletedAt: null })
    .select({ _id: 1, avatar: 1, lastActiveAt: 1, createdAt: 1 })
    .exec();

  const rankingUsers: DiscoverRankingUser[] = users.map((user) => ({
    id: user._id.toString(),
    registeredAt: user.createdAt,
    hasAvatar: user.avatar !== null,
    lastActiveAt: user.lastActiveAt,
  }));

  const metricsByUserId = await collectDiscoverMetrics(
    rankingUsers,
    users.map((user) => user._id),
    calculatedAt,
  );

  const operations = users.map((user) => {
    const metrics = metricsByUserId.get(user._id.toString());

    if (!metrics) {
      throw new Error(`Discover metrics are missing for user ${user._id.toString()}`);
    }

    const result = calculateDiscoverScore(metrics, calculatedAt);

    return {
      updateOne: {
        filter: { _id: user._id, status: 'active' as const, deletedAt: null },
        update: {
          $set: {
            discoverScore: result.score,
            discoverScoreVersion: DISCOVER_SCORE_VERSION,
            discoverScoreUpdatedAt: calculatedAt,
          },
        },
      },
    };
  });

  let matchedUsers = 0;

  let modifiedUsers = 0;

  for (let index = 0; index < operations.length; index += DISCOVER_RANKING_BATCH_SIZE) {
    const batch = operations.slice(index, index + DISCOVER_RANKING_BATCH_SIZE);

    const result = await User.bulkWrite(batch, { ordered: false });

    matchedUsers += result.matchedCount;
    modifiedUsers += result.modifiedCount;
  }

  return {
    processedUsers: users.length,
    matchedUsers,
    modifiedUsers,
    calculatedAt,
    durationMs: Date.now() - startedAt,
  };
};

export default recalculateDiscoverRankings;
