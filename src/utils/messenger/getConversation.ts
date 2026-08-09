import getConversationAccess from './getConversationAccess';
import serializeConversation from './serializeConversation';
import type { GetConversationResult } from '../../types/messenger/conversation';

const getConversation = async (
  userId: string,
  conversationId: string,
): Promise<GetConversationResult> => {
  const access = await getConversationAccess(userId, conversationId);

  if (!access.ok) {
    return access;
  }

  return {
    ok: true,
    conversation: serializeConversation(access.conversation, access.otherParticipant, userId),
  };
};

export default getConversation;
