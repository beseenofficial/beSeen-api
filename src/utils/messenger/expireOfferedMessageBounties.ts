import type { Types } from 'mongoose';

import MessageBounty from '../../models/MessageBounty';

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

  const result = await MessageBounty.updateMany(filter, {
    $set: { status: 'expired' },
  }).exec();

  return result.modifiedCount;
};

export default expireOfferedMessageBounties;
