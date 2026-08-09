import User from '../../models/User';
import Conversation from '../../models/Conversation';
import type { GetConversationAccessResult } from '../../types/messenger/conversation';

const getConversationAccess = async (
  userId: string,
  conversationId: string,
): Promise<GetConversationAccessResult> => {
  const viewer = await User.findOne({ _id: userId, status: 'active', deletedAt: null }).exec();

  if (!viewer) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    $or: [{ participantA: viewer._id }, { participantB: viewer._id }],
  }).exec();

  if (!conversation) {
    return { ok: false, reason: 'conversation_not_found' };
  }

  const otherParticipantId = conversation.participantA.equals(viewer._id)
    ? conversation.participantB
    : conversation.participantA;

  const otherParticipant = await User.findOne({
    _id: otherParticipantId,
    status: 'active',
    deletedAt: null,
  }).exec();

  if (!otherParticipant) {
    return { ok: false, reason: 'participant_unavailable' };
  }

  return { ok: true, conversation, viewer, otherParticipant };
};

export default getConversationAccess;
