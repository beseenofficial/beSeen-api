import type { UserDocument } from '../../models/User';
import type { ConversationDocument } from '../../models/Conversation';

interface ConversationView {
  id: string;
  otherParticipant: {
    id: string;
    username: string;
    avatar: string | null;
  };
  unreadCount: number;
  readState: {
    viewerReadSequence: number;
    otherParticipantReadSequence: number;
  };
  lastMessage: {
    sequence: number;
    clientMessageId: string;
    senderId: string;
    createdAt: Date;
  } | null;
  lastMessageAt: Date | null;
  createdAt: Date;
}

const serializeConversation = (
  conversation: ConversationDocument,
  otherParticipant: UserDocument,
  viewerId: string,
): ConversationView => ({
  id: conversation._id.toString(),
  otherParticipant: {
    id: otherParticipant._id.toString(),
    username: otherParticipant.username,
    avatar: otherParticipant.avatar,
  },
  unreadCount:
    conversation.participantA.toString() === viewerId
      ? (conversation.participantAUnreadCount ?? 0)
      : (conversation.participantBUnreadCount ?? 0),
  readState:
    conversation.participantA.toString() === viewerId
      ? {
          viewerReadSequence: conversation.participantAReadSequence ?? 0,
          otherParticipantReadSequence: conversation.participantBReadSequence ?? 0,
        }
      : {
          viewerReadSequence: conversation.participantBReadSequence ?? 0,
          otherParticipantReadSequence: conversation.participantAReadSequence ?? 0,
        },
  lastMessage:
    conversation.lastMessageAt &&
    conversation.lastMessageSender &&
    conversation.lastMessageClientMessageId
      ? {
          sequence: conversation.nextSequence - 1,
          clientMessageId: conversation.lastMessageClientMessageId,
          senderId: conversation.lastMessageSender.toString(),
          createdAt: conversation.lastMessageAt,
        }
      : null,
  lastMessageAt: conversation.lastMessageAt,
  createdAt: conversation.createdAt,
});

export default serializeConversation;
export type { ConversationView };
