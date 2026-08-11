import type { Types } from 'mongoose';

import Message from '../../../models/Message';
import type { DiscoverChatMetrics } from '../../../types/discover';

interface ChatMetricsRecord {
  _id: Types.ObjectId;
  reciprocalConversationCount30d: number;
  lastReciprocalChatAt: Date;
}

const collectChatMetrics = async (
  userIds: Types.ObjectId[],
  activityCutoff: Date,
): Promise<DiscoverChatMetrics[]> => {
  const records = await Message.aggregate<ChatMetricsRecord>([
    { $match: { createdAt: { $gte: activityCutoff } } },
    {
      $group: {
        _id: '$conversation',
        senders: { $addToSet: '$sender' },
        lastReciprocalChatAt: { $max: '$createdAt' },
      },
    },
    { $match: { 'senders.1': { $exists: true } } },
    { $unwind: '$senders' },
    { $match: { senders: { $in: userIds } } },
    {
      $group: {
        _id: '$senders',
        reciprocalConversationCount30d: { $sum: 1 },
        lastReciprocalChatAt: { $max: '$lastReciprocalChatAt' },
      },
    },
  ]).exec();

  return records.map((record) => ({
    userId: record._id.toString(),
    reciprocalConversationCount30d: record.reciprocalConversationCount30d,
    lastReciprocalChatAt: record.lastReciprocalChatAt,
  }));
};

export default collectChatMetrics;
