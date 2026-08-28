import type { Types } from 'mongoose';

import { withDatabaseTransaction } from '../../db';
import MessageBounty from '../../models/MessageBounty';
import expireMessageBounty from './expireMessageBounty';

const expireOfferedMessageBounties = async (
  now: Date,
  messageIds?: Types.ObjectId[],
): Promise<number> => {
  if (messageIds && messageIds.length === 0) {
    return 0;
  }

  const filter: Record<string, unknown> = {
    status: 'offered',
    expiresAt: { $lte: now },
  };

  if (messageIds) {
    filter.message = { $in: messageIds };
  }

  const bounties = await MessageBounty.find(filter).select({ _id: 1 }).exec();
  let expiredCount = 0;

  for (const bounty of bounties) {
    const expired = await withDatabaseTransaction((session) =>
      expireMessageBounty(bounty._id, now, session),
    );

    if (expired) {
      expiredCount += 1;
    }
  }

  return expiredCount;
};

export default expireOfferedMessageBounties;
