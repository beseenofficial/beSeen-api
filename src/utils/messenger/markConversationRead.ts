import type { ClientSession } from 'mongoose';

import User from '../../models/User';
import Message from '../../models/Message';
import { withDatabaseTransaction } from '../../db';
import Conversation from '../../models/Conversation';
import type { MarkConversationReadResult } from '../../types/messenger/conversation';

const markConversationReadInTransaction = async (
  userId: string,
  conversationId: string,
  throughSequence: number,
  session: ClientSession,
): Promise<MarkConversationReadResult> => {
  const viewer = await User.findOne({
    _id: userId,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!viewer) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    $or: [{ participantA: viewer._id }, { participantB: viewer._id }],
  })
    .session(session)
    .exec();

  if (!conversation) {
    return { ok: false, reason: 'conversation_not_found' };
  }

  const latestSequence = conversation.nextSequence - 1;

  if (throughSequence > latestSequence) {
    return { ok: false, reason: 'read_sequence_not_found' };
  }

  const viewerIsParticipantA = conversation.participantA.equals(viewer._id);

  const readSequenceField = viewerIsParticipantA
    ? 'participantAReadSequence'
    : 'participantBReadSequence';

  const unreadCountField = viewerIsParticipantA
    ? 'participantAUnreadCount'
    : 'participantBUnreadCount';

  const currentReadSequence = conversation[readSequenceField] ?? 0;

  const currentUnreadCount = conversation[unreadCountField] ?? 0;

  if (throughSequence <= currentReadSequence) {
    return {
      ok: true,
      readState: {
        conversationId: conversation._id.toString(),
        readSequence: currentReadSequence,
        unreadCount: currentUnreadCount,
      },
      updated: false,
    };
  }

  const unreadCount = await Message.countDocuments({
    conversation: conversation._id,
    recipient: viewer._id,
    sequence: { $gt: throughSequence },
  })
    .session(session)
    .exec();

  const updatedConversation = await Conversation.findOneAndUpdate(
    {
      _id: conversation._id,
      $or: [{ participantA: viewer._id }, { participantB: viewer._id }],
    },
    {
      $set: {
        [readSequenceField]: throughSequence,
        [unreadCountField]: unreadCount,
      },
    },
    { returnDocument: 'after', session, runValidators: true },
  ).exec();

  if (!updatedConversation) {
    return { ok: false, reason: 'conversation_not_found' };
  }

  return {
    ok: true,
    readState: {
      conversationId: updatedConversation._id.toString(),
      readSequence: updatedConversation[readSequenceField],
      unreadCount: updatedConversation[unreadCountField],
    },
    updated: true,
  };
};

const markConversationRead = async (
  userId: string,
  conversationId: string,
  throughSequence: number,
): Promise<MarkConversationReadResult> =>
  withDatabaseTransaction((session) =>
    markConversationReadInTransaction(userId, conversationId, throughSequence, session),
  );

export default markConversationRead;
