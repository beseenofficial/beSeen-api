import getConversationAccess from './getConversationAccess';
import type { ConversationAccessFailureReason } from './getConversationAccess';
import serializeConversation from './serializeConversation';
import type { ConversationView } from './serializeConversation';

type GetConversationResult =
  | { ok: true; conversation: ConversationView }
  | { ok: false; reason: ConversationAccessFailureReason };

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
export type { GetConversationResult };
