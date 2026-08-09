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

interface ConversationPage {
  items: ConversationView[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface ConversationContextParticipant {
  id: string;
  username: string;
  avatar: string | null;
  keyVersion: number;
  signingPublicKey: string;
  encryptionPublicKey: string;
}

interface ConversationContext {
  conversationId: string;
  viewer: ConversationContextParticipant;
  otherParticipant: ConversationContextParticipant;
}

interface ConversationCursor {
  lastMessageAt: Date | null;
  id: string;
}

interface EnsuredConversation {
  conversation: ConversationDocument;
  created: boolean;
}

interface ConversationReadState {
  conversationId: string;
  readSequence: number;
  unreadCount: number;
}

type ConversationAccessFailureReason =
  'account_unavailable' | 'conversation_not_found' | 'participant_unavailable';

type GetConversationAccessResult =
  | {
      ok: true;
      conversation: ConversationDocument;
      viewer: UserDocument;
      otherParticipant: UserDocument;
    }
  | { ok: false; reason: ConversationAccessFailureReason };

type GetConversationsResult =
  { ok: true; conversations: ConversationPage } | { ok: false; reason: 'account_unavailable' };

type GetConversationResult =
  | { ok: true; conversation: ConversationView }
  | { ok: false; reason: ConversationAccessFailureReason };

type GetConversationContextResult =
  | { ok: true; context: ConversationContext }
  | { ok: false; reason: ConversationAccessFailureReason | 'active_keys_not_found' };

type MarkConversationReadFailureReason =
  'account_unavailable' | 'conversation_not_found' | 'read_sequence_not_found';

type MarkConversationReadResult =
  | { ok: true; readState: ConversationReadState; updated: boolean }
  | { ok: false; reason: MarkConversationReadFailureReason };

export type {
  ConversationAccessFailureReason,
  ConversationContext,
  ConversationContextParticipant,
  ConversationCursor,
  ConversationPage,
  ConversationReadState,
  ConversationView,
  EnsuredConversation,
  GetConversationAccessResult,
  GetConversationContextResult,
  GetConversationResult,
  GetConversationsResult,
  MarkConversationReadFailureReason,
  MarkConversationReadResult,
};
