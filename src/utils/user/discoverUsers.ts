import { Types } from 'mongoose';

import TokenHolding from '../../models/TokenHolding';
import User from '../../models/User';
import UserToken from '../../models/UserToken';
import getUserVerification from './getUserVerification';
import type { DiscoverUsersPage } from '../../types/user';
import type { DiscoverUsersQuery } from '../../validation/user/discover';
import { encodeDiscoverCursor } from '../discover/discoverCursor';

interface FollowCountRecord {
  _id: Types.ObjectId;
  count: number;
}

interface DiscoverFollowCounts {
  followerCounts: FollowCountRecord[];
  followingCounts: FollowCountRecord[];
}

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

  const followCounts = userIds.length
    ? await TokenHolding.aggregate<DiscoverFollowCounts>([
        {
          $facet: {
            followerCounts: [
              {
                $lookup: {
                  from: UserToken.collection.name,
                  localField: 'token',
                  foreignField: '_id',
                  as: 'tokenDocument',
                },
              },
              { $unwind: '$tokenDocument' },
              { $match: { 'tokenDocument.owner': { $in: userIds } } },
              { $group: { _id: '$tokenDocument.owner', count: { $sum: 1 } } },
            ],
            followingCounts: [
              { $match: { holder: { $in: userIds } } },
              { $group: { _id: '$holder', count: { $sum: 1 } } },
            ],
          },
        },
      ]).exec()
    : [];

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
