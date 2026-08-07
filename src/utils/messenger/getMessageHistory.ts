import {
  MESSENGER_CONTENT_ENCRYPTION_SUITE,
  MESSENGER_KEY_WRAP_SUITE,
} from '../../constant/messenger';
import Message from '../../models/Message';
import type { MessageDocument } from '../../models/Message';
import MessageBounty from '../../models/MessageBounty';
import type { MessageBountyDocument } from '../../models/MessageBounty';
import type { MessageHistoryQuery } from '../../validation/messenger/messageHistory';
import expireOfferedMessageBounties from './expireOfferedMessageBounties';
import getConversationAccess from './getConversationAccess';
import type { ConversationAccessFailureReason } from './getConversationAccess';

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
  bounty: {
    id: string;
    assetCode: string;
    amount: string;
    durationSeconds: number;
    status: string;
    expiresAt: Date;
    replyMessageId: string | null;
    claimableAt: Date | null;
    claimedAt: Date | null;
  } | null;
  createdAt: Date;
}

interface MessageHistoryPage {
  items: MessageHistoryItem[];
  nextBeforeSequence: number | null;
  hasMore: boolean;
}

type GetMessageHistoryResult =
  | { ok: true; history: MessageHistoryPage }
  | { ok: false; reason: ConversationAccessFailureReason };

const serializeMessageHistoryItem = (
  message: MessageDocument,
  viewerId: string,
  recipientReadSequence: number,
  bounty: MessageBountyDocument | null,
): MessageHistoryItem => {
  const viewerIsSender = message.sender.toString() === viewerId;

  return {
    id: message._id.toString(),
    sequence: message.sequence,
    manifest: {
      signatureVersion: message.signatureVersion,
      encryptionVersion: message.encryptionVersion,
      contentSuite: MESSENGER_CONTENT_ENCRYPTION_SUITE,
      keyWrapSuite: MESSENGER_KEY_WRAP_SUITE,
      conversationId: message.conversation.toString(),
      clientMessageId: message.clientMessageId,
      senderId: message.sender.toString(),
      recipientId: message.recipient.toString(),
      senderKeyVersion: message.senderKeyVersion,
      recipientKeyVersion: message.recipientKeyVersion,
      senderSigningPublicKey: message.senderSigningPublicKey,
      senderEncryptionPublicKey: message.senderEncryptionPublicKey,
      recipientEncryptionPublicKey: message.recipientEncryptionPublicKey,
      contentCiphertext: message.contentCiphertext,
      contentNonce: message.contentNonce,
      senderEncryptedMessageKey: message.senderEncryptedMessageKey,
      recipientEncryptedMessageKey: message.recipientEncryptedMessageKey,
      replyToMessageId: message.replyToMessage?.toString() ?? null,
      bountyTerms: message.bountyAssetCode
        ? {
            assetCode: message.bountyAssetCode,
            amount: message.bountyAmount!,
            durationSeconds: message.bountyDurationSeconds!,
          }
        : null,
    },
    viewerKey: viewerIsSender
      ? {
          source: 'sender',
          keyVersion: message.senderKeyVersion,
          encryptionPublicKey: message.senderEncryptionPublicKey,
          encryptedMessageKey: message.senderEncryptedMessageKey,
        }
      : {
          source: 'recipient',
          keyVersion: message.recipientKeyVersion,
          encryptionPublicKey: message.recipientEncryptionPublicKey,
          encryptedMessageKey: message.recipientEncryptedMessageKey,
        },
    integrity: {
      algorithm: 'Ed25519',
      signingPublicKey: message.senderSigningPublicKey,
      signature: message.signature,
    },
    delivery: {
      seenByRecipient: recipientReadSequence >= message.sequence,
    },
    bounty: bounty
      ? {
          id: bounty._id.toString(),
          assetCode: bounty.assetCode,
          amount: bounty.amount,
          durationSeconds: bounty.durationSeconds,
          status: bounty.status,
          expiresAt: bounty.expiresAt,
          replyMessageId: bounty.replyMessage?.toString() ?? null,
          claimableAt: bounty.claimableAt,
          claimedAt: bounty.claimedAt,
        }
      : null,
    createdAt: message.createdAt,
  };
};

const getMessageHistory = async (
  userId: string,
  conversationId: string,
  query: MessageHistoryQuery,
): Promise<GetMessageHistoryResult> => {
  const access = await getConversationAccess(userId, conversationId);

  if (!access.ok) {
    return access;
  }

  const match: Record<string, unknown> = { conversation: access.conversation._id };

  if (query.beforeSequence) {
    match.sequence = { $lt: query.beforeSequence };
  }

  const rows = await Message.find(match)
    .sort({ sequence: -1 })
    .limit(query.limit + 1)
    .exec();
  const hasMore = rows.length > query.limit;
  const pageRows = hasMore ? rows.slice(0, query.limit) : rows;

  await expireOfferedMessageBounties(
    new Date(),
    pageRows.map((message) => message._id),
  );

  const bounties =
    pageRows.length > 0
      ? await MessageBounty.find({
          message: { $in: pageRows.map((message) => message._id) },
        }).exec()
      : [];
  const bountiesByMessage = new Map(bounties.map((bounty) => [bounty.message.toString(), bounty]));
  const participantAReadSequence = access.conversation.participantAReadSequence ?? 0;
  const participantBReadSequence = access.conversation.participantBReadSequence ?? 0;
  const items = pageRows.map((message) => {
    const recipientReadSequence = access.conversation.participantA.equals(message.recipient)
      ? participantAReadSequence
      : participantBReadSequence;

    return serializeMessageHistoryItem(
      message,
      userId,
      recipientReadSequence,
      bountiesByMessage.get(message._id.toString()) ?? null,
    );
  });
  const oldestItem = items.at(-1);

  return {
    ok: true,
    history: {
      items,
      nextBeforeSequence: hasMore && oldestItem ? oldestItem.sequence : null,
      hasMore,
    },
  };
};

export default getMessageHistory;
export type { GetMessageHistoryResult, MessageHistoryItem, MessageHistoryPage };
