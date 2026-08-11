import User from '../models/User';
import Message from '../models/Message';
import Broadcast from '../models/Broadcast';
import TokenHolding from '../models/TokenHolding';
import MessageBounty from '../models/MessageBounty';
import type { DiscoverRankingMigrationResult } from '../types/discover';
import { DISCOVER_SCORE_VERSION } from '../constant/discover';

const DISCOVER_INDEX_COUNT = 5;

const addDiscoverRanking = async (): Promise<DiscoverRankingMigrationResult> => {
  const backfillResult = await User.collection.updateMany(
    {
      $or: [
        { discoverScore: { $exists: false } },
        { discoverScoreVersion: { $exists: false } },
        { discoverScoreUpdatedAt: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          discoverScore: { $ifNull: ['$discoverScore', 0] },
          discoverScoreVersion: {
            $ifNull: ['$discoverScoreVersion', DISCOVER_SCORE_VERSION],
          },
          discoverScoreUpdatedAt: { $ifNull: ['$discoverScoreUpdatedAt', null] },
        },
      },
    ],
  );

  await Promise.all([
    User.collection.createIndex(
      { status: 1, discoverScore: -1, _id: -1 },
      { name: 'users_discover_ranking' },
    ),
    TokenHolding.collection.createIndex(
      { token: 1, createdAt: -1 },
      { name: 'token_holdings_token_activity' },
    ),
    Message.collection.createIndex(
      { createdAt: -1, conversation: 1 },
      { name: 'messages_recent_conversation_activity' },
    ),
    MessageBounty.collection.createIndex(
      { status: 1, beneficiary: 1, claimedAt: -1 },
      { name: 'message_bounties_claimed_beneficiary' },
    ),
    Broadcast.collection.createIndex(
      { status: 1, creator: 1, publishedAt: -1 },
      { name: 'broadcasts_published_creator_activity' },
    ),
  ]);

  return {
    matchedUsers: backfillResult.matchedCount,
    modifiedUsers: backfillResult.modifiedCount,
    ensuredIndexes: DISCOVER_INDEX_COUNT,
  };
};

export default addDiscoverRanking;
