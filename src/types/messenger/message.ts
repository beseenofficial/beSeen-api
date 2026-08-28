import type { SerializedMessageBounty } from './bounty';
import type { ConversationAccessFailureReason } from './conversation';

interface MessageSignatureMessageInput {
  conversationId: string;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  encryptionVersion: number;
  senderKeyVersion: number;
  recipientKeyVersion: number;
  senderSigningPublicKey: string;
  senderEncryptionPublicKey: string;
  recipientEncryptionPublicKey: string;
  contentCiphertext: string;
  contentNonce: string;
  senderEncryptedMessageKey: string;
  recipientEncryptedMessageKey: string;
  replyToMessageId: string | null;
  bounty?: {
    assetCode: string;
    amount: string;
    durationSeconds: number;
  } | null;
}

interface SentMessage {
  id: string;
  conversationId: string;
  sequence: number;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  replyToMessageId: string | null;
  bounty: SerializedMessageBounty | null;
  unlockedBounty: SerializedMessageBounty | null;
  createdAt: Date;
}

interface MessageHistoryItem {
  id: string;
  sequence: number;
  manifest: {
    signatureVersion: number;
    encryptionVersion: number;
    contentSuite: string;
    keyWrapSuite: string;
    conversationId: string;
    clientMessageId: string;
    senderId: string;
    recipientId: string;
    senderKeyVersion: number;
    recipientKeyVersion: number;
    senderSigningPublicKey: string;
    senderEncryptionPublicKey: string;
    recipientEncryptionPublicKey: string;
    contentCiphertext: string;
    contentNonce: string;
    senderEncryptedMessageKey: string;
    recipientEncryptedMessageKey: string;
    replyToMessageId: string | null;
    bountyTerms: {
      assetCode: string;
      amount: string;
      durationSeconds: number;
    } | null;
  };
  viewerKey: {
    source: 'sender' | 'recipient';
    keyVersion: number;
    encryptionPublicKey: string;
    encryptedMessageKey: string;
  };
  integrity: {
    algorithm: 'Ed25519';
    signingPublicKey: string;
    signature: string;
  };
  delivery: {
    seenByRecipient: boolean;
  };
  bounty: SerializedMessageBounty | null;
  createdAt: Date;
}

interface MessageHistoryPage {
  items: MessageHistoryItem[];
  nextBeforeSequence: number | null;
  hasMore: boolean;
}

type SendMessageFailureReason =
  | 'account_unavailable'
  | 'conversation_not_found'
  | 'participant_unavailable'
  | 'active_keys_not_found'
  | 'reply_not_found'
  | 'invalid_signature'
  | 'insufficient_demo_usdc_balance'
  | 'message_conflict';

type SendMessageResult =
  | { ok: true; message: SentMessage; created: boolean }
  | { ok: false; reason: SendMessageFailureReason };

type GetMessageHistoryResult =
  | { ok: true; history: MessageHistoryPage }
  | { ok: false; reason: ConversationAccessFailureReason };

export type {
  GetMessageHistoryResult,
  MessageHistoryItem,
  MessageHistoryPage,
  MessageSignatureMessageInput,
  SendMessageFailureReason,
  SendMessageResult,
  SentMessage,
};
