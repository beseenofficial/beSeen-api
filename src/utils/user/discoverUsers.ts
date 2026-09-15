import { Types } from 'mongoose';
import User from '../../models/User';
import AuraFollow from '../../models/AuraFollow';
import getUserVerification from './getUserVerification';
import { encodeDiscoverCursor } from '../discover/discoverCursor';
import getContractAuraPrices from '../contract/getContractAuraPrices';
import type { DiscoverUsersQuery } from '../../validation/user/discover';
import type { DiscoverFollowCounts, DiscoverUsersPage } from '../../types/user';

const discoverUsers = async (query: DiscoverUsersQuery): Promise<DiscoverUsersPage> => {
  const filter: Record<string, unknown> = {
    status: 'active',
    deletedAt: null,
  };

  if (query.cursor) {
    filter.$or = [
      { discoverScore: { $lt: query.cursor.score } },
      {
        discoverScore: query.cursor.score,
        _id: { $lt: new Types.ObjectId(query.cursor.id) },
      },
    ];
  }

  const rows = await User.find(filter)
    .select({
      username: 1,
      avatar: 1,
      bio: 1,
      walletAddress: 1,
      verificationGrantedAt: 1,
      verificationExpiresAt: 1,
      discoverScore: 1,
    })
    .sort({ discoverScore: -1, _id: -1 })
    .limit(query.limit + 1)
    .exec();

  const hasMore = rows.length > query.limit;

  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

  const lastUser = pageRows.at(-1);

  const userIds = pageRows.map((user) => user._id);

  const [followCounts, auraPriceByWalletAddress] = await Promise.all([
    userIds.length
      ? AuraFollow.aggregate<DiscoverFollowCounts>([
          {
            $facet: {
              followerCounts: [
                { $match: { subject: { $in: userIds } } },
                { $group: { _id: '$subject', count: { $sum: 1 } } },
              ],
              followingCounts: [
                { $match: { follower: { $in: userIds } } },
                { $group: { _id: '$follower', count: { $sum: 1 } } },
              ],
            },
          },
        ]).exec()
      : [],
    getContractAuraPrices(pageRows.map((user) => user.walletAddress)),
  ]);

  const followerCountByUserId = new Map(
    (followCounts[0]?.followerCounts ?? []).map((record) => [record._id.toString(), record.count]),
  );

  const followingCountByUserId = new Map(
    (followCounts[0]?.followingCounts ?? []).map((record) => [record._id.toString(), record.count]),
  );

  return {
    users: pageRows.map((user) => {
      const userId = user._id.toString();

      return {
        id: userId,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        auraPrice: auraPriceByWalletAddress.get(user.walletAddress) ?? null,
        followerCount: followerCountByUserId.get(userId) ?? 0,
        followingCount: followingCountByUserId.get(userId) ?? 0,
        verification: getUserVerification(user),
      };
    }),
    nextCursor:
      hasMore && lastUser
        ? encodeDiscoverCursor({
            score: lastUser.discoverScore,
            id: lastUser._id.toString(),
          })
        : null,
    hasMore,
  };
};

export default discoverUsers;
