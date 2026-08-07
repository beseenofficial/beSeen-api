import type { ConversationDocument } from '../../models/Conversation';
import type { UserDocument } from '../../models/User';

interface ConversationView {
  id: string;
  otherParticipant: {
    id: string;
    username: string;
    avatar: string | null;
  };
  lastMessageAt: Date | null;
  createdAt: Date;
}

const serializeConversation = (
  conversation: ConversationDocument,
  otherParticipant: UserDocument,
): ConversationView => ({
  id: conversation._id.toString(),
  otherParticipant: {
    id: otherParticipant._id.toString(),
    username: otherParticipant.username,
    avatar: otherParticipant.avatar,
  },
  lastMessageAt: conversation.lastMessageAt,
  createdAt: conversation.createdAt,
});

export default serializeConversation;
export type { ConversationView };
