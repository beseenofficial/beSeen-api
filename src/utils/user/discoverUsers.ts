import { Types } from 'mongoose';

import User from '../../models/User';
import getUserVerification from './getUserVerification';
import type { DiscoverUsersPage } from '../../types/user';
import type { DiscoverUsersQuery } from '../../validation/user/discover';
import { encodeDiscoverCursor } from '../discover/discoverCursor';

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

  return {
    users: pageRows.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar,
      verification: getUserVerification(user),
    })),
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
