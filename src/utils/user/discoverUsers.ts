import { Types } from 'mongoose';

import User from '../../models/User';
import type { DiscoverUsersPage } from '../../types/user';
import type { DiscoverUsersQuery } from '../../validation/user/discover';

const discoverUsers = async (query: DiscoverUsersQuery): Promise<DiscoverUsersPage> => {
  const filter: Record<string, unknown> = {
    status: 'active',
    deletedAt: null,
  };

  if (query.cursor) {
    filter._id = { $lt: new Types.ObjectId(query.cursor) };
  }

  const rows = await User.find(filter)
    .select({ username: 1, avatar: 1 })
    .sort({ _id: -1 })
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
    })),
    nextCursor: hasMore && lastUser ? lastUser._id.toString() : null,
    hasMore,
  };
};

export default discoverUsers;
