import { Types } from 'mongoose';

import Conversation from '../../models/Conversation';
import User from '../../models/User';
import type { ConversationListQuery } from '../../validation/messenger/conversation';
import serializeConversation from './serializeConversation';
import type { ConversationView } from './serializeConversation';

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

  const match: Record<string, unknown> = {
    $or: [{ participantA: viewer._id }, { participantB: viewer._id }],
  };

  if (query.cursor) {
    match._id = { $lt: new Types.ObjectId(query.cursor) };
  }

  const rows = await Conversation.find(match)
    .sort({ _id: -1 })
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

    return [serializeConversation(conversation, otherParticipant)];
  });
  const lastRow = pageRows.at(-1);

  return {
    ok: true,
    conversations: {
      items,
      nextCursor: hasMore && lastRow ? lastRow._id.toString() : null,
      hasMore,
    },
  };
};

export default getConversations;
export type { ConversationPage, GetConversationsResult };
