import { Types } from 'mongoose';

import User from '../../models/User';
import Conversation from '../../models/Conversation';
import serializeConversation from './serializeConversation';
import { encodeConversationCursor } from './conversationCursor';
import type { ConversationView } from './serializeConversation';
import type { ConversationListQuery } from '../../validation/messenger/conversation';

interface ConversationPage {
  items: ConversationView[];
  nextCursor: string | null;
  hasMore: boolean;
}

type GetConversationsResult =
  { ok: true; conversations: ConversationPage } | { ok: false; reason: 'account_unavailable' };

const getConversations = async (
  userId: string,
  query: ConversationListQuery,
): Promise<GetConversationsResult> => {
  const viewer = await User.findOne({ _id: userId, status: 'active', deletedAt: null }).exec();

  if (!viewer) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const participantMatch = [{ participantA: viewer._id }, { participantB: viewer._id }];

  const match: Record<string, unknown> = { $or: participantMatch };

  if (query.cursor) {
    const cursorId = new Types.ObjectId(query.cursor.id);

    const activityMatch = query.cursor.lastMessageAt
      ? [
          { lastMessageAt: { $lt: query.cursor.lastMessageAt } },
          { lastMessageAt: query.cursor.lastMessageAt, _id: { $lt: cursorId } },
          { lastMessageAt: null },
        ]
      : [{ lastMessageAt: null, _id: { $lt: cursorId } }];

    match.$and = [{ $or: participantMatch }, { $or: activityMatch }];

    delete match.$or;
  }

  const rows = await Conversation.find(match)
    .sort({ lastMessageAt: -1, _id: -1 })
    .limit(query.limit + 1)
    .exec();

  const hasMore = rows.length > query.limit;

  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

  const otherParticipantIds = pageRows.map((conversation) =>
    conversation.participantA.equals(viewer._id)
      ? conversation.participantB
      : conversation.participantA,
  );

  const otherParticipants = await User.find({
    _id: { $in: otherParticipantIds },
    status: 'active',
    deletedAt: null,
  }).exec();

  const usersById = new Map(otherParticipants.map((user) => [user._id.toString(), user]));
  
  const items = pageRows.flatMap((conversation) => {
    const otherParticipantId = conversation.participantA.equals(viewer._id)
      ? conversation.participantB
      : conversation.participantA;

    const otherParticipant = usersById.get(otherParticipantId.toString());

    if (!otherParticipant) {
      return [];
    }

    return [serializeConversation(conversation, otherParticipant, viewer._id.toString())];
  });
  
  const lastRow = pageRows.at(-1);

  return {
    ok: true,
    conversations: {
      items,
      nextCursor:
        hasMore && lastRow
          ? encodeConversationCursor({
              lastMessageAt: lastRow.lastMessageAt,
              id: lastRow._id.toString(),
            })
          : null,
      hasMore,
    },
  };
};

export default getConversations;
export type { ConversationPage, GetConversationsResult };
