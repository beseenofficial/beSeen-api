import type { ClientSession } from 'mongoose';

import {
  MESSENGER_ENCRYPTION_VERSION,
  MESSENGER_SIGNATURE_VERSION,
} from '../../constant/messenger';
import type { MessengerBountyStatus } from '../../constant/messenger';
import { withDatabaseTransaction } from '../../db';
import Conversation from '../../models/Conversation';
import Message from '../../models/Message';
import type { MessageDocument } from '../../models/Message';
import MessageBounty from '../../models/MessageBounty';
import type { MessageBountyDocument } from '../../models/MessageBounty';
import User from '../../models/User';
import UserKey from '../../models/UserKey';
import type { SendMessageBody } from '../../validation/messenger/sendMessage';
import verifyEd25519Signature from '../crypto/verifyEd25519Signature';
import buildMessageSignatureMessage from './buildMessageSignatureMessage';

type SendMessageFailureReason =
  | 'account_unavailable'
  | 'conversation_not_found'
  | 'participant_unavailable'
  | 'active_keys_not_found'
  | 'reply_not_found'
  | 'invalid_signature'
  | 'message_conflict';

interface SentMessage {
  id: string;
  conversationId: string;
  sequence: number;
  clientMessageId: string;
  senderId: string;
  recipientId: string;
  replyToMessageId: string | null;
  bounty: {
    id: string;
    assetCode: string;
    amount: string;
    durationSeconds: number;
    status: MessengerBountyStatus;
    expiresAt: Date;
    replyMessageId: string | null;
    claimableAt: Date | null;
    claimedAt: Date | null;
  } | null;
  createdAt: Date;
}

type SendMessageResult =
  | { ok: true; message: SentMessage; created: boolean }
  | { ok: false; reason: SendMessageFailureReason };

interface MongoDuplicateKeyError extends Error {
  code: number;
}

const isMongoDuplicateKeyError = (error: unknown): error is MongoDuplicateKeyError =>
  error instanceof Error && 'code' in error && error.code === 11_000;

const serializeSentMessage = (
  message: MessageDocument,
  bounty: MessageBountyDocument | null,
): SentMessage => ({
  id: message._id.toString(),
  conversationId: message.conversation.toString(),
  sequence: message.sequence,
  clientMessageId: message.clientMessageId,
  senderId: message.sender.toString(),
  recipientId: message.recipient.toString(),
  replyToMessageId: message.replyToMessage?.toString() ?? null,
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
});

const hasSameClientEnvelope = (
  message: MessageDocument,
  conversationId: string,
  senderId: string,
  body: SendMessageBody,
): boolean => {
  const replyToMessageId = message.replyToMessage?.toString() ?? null;
  const bounty = body.bounty ?? null;

  return (
    message.conversation.toString() === conversationId &&
    message.sender.toString() === senderId &&
    message.clientMessageId === body.clientMessageId &&
    message.contentCiphertext === body.contentCiphertext &&
    message.contentNonce === body.contentNonce &&
    message.senderEncryptedMessageKey === body.senderEncryptedMessageKey &&
    message.recipientEncryptedMessageKey === body.recipientEncryptedMessageKey &&
    replyToMessageId === body.replyToMessageId &&
    message.bountyAssetCode === (bounty?.assetCode ?? null) &&
    message.bountyAmount === (bounty?.amount ?? null) &&
    message.bountyDurationSeconds === (bounty?.durationSeconds ?? null) &&
    message.signature === body.signature
  );
};

const findMessageBounty = async (
  message: MessageDocument,
  session?: ClientSession,
): Promise<MessageBountyDocument | null> => {
  const query = MessageBounty.findOne({ message: message._id });

  if (session) {
    query.session(session);
  }

  return query.exec();
};

const idempotentResult = async (
  message: MessageDocument,
  conversationId: string,
  senderId: string,
  body: SendMessageBody,
  session?: ClientSession,
): Promise<SendMessageResult> => {
  if (!hasSameClientEnvelope(message, conversationId, senderId, body)) {
    return { ok: false, reason: 'message_conflict' };
  }

  const bounty = await findMessageBounty(message, session);

  return { ok: true, message: serializeSentMessage(message, bounty), created: false };
};

const sendMessageInTransaction = async (
  senderId: string,
  conversationId: string,
  body: SendMessageBody,
  session: ClientSession,
): Promise<SendMessageResult> => {
  const existingMessage = await Message.findOne({
    sender: senderId,
    clientMessageId: body.clientMessageId,
  })
    .session(session)
    .exec();

  if (existingMessage) {
    return idempotentResult(existingMessage, conversationId, senderId, body, session);
  }

  const sender = await User.findOne({
    _id: senderId,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!sender) {
    return { ok: false, reason: 'account_unavailable' };
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    $or: [{ participantA: sender._id }, { participantB: sender._id }],
  })
    .session(session)
    .exec();

  if (!conversation) {
    return { ok: false, reason: 'conversation_not_found' };
  }

  const recipientId = conversation.participantA.equals(sender._id)
    ? conversation.participantB
    : conversation.participantA;
  const recipient = await User.findOne({
    _id: recipientId,
    status: 'active',
    deletedAt: null,
  })
    .session(session)
    .exec();

  if (!recipient) {
    return { ok: false, reason: 'participant_unavailable' };
  }

  const [senderKey, recipientKey] = await Promise.all([
    UserKey.findOne({ user: sender._id, status: 'active', revokedAt: null })
      .session(session)
      .exec(),
    UserKey.findOne({ user: recipient._id, status: 'active', revokedAt: null })
      .session(session)
      .exec(),
  ]);

  if (!senderKey || !recipientKey) {
    return { ok: false, reason: 'active_keys_not_found' };
  }

  if (body.replyToMessageId) {
    const replyExists = await Message.exists({
      _id: body.replyToMessageId,
      conversation: conversation._id,
    })
      .session(session)
      .exec();

    if (!replyExists) {
      return { ok: false, reason: 'reply_not_found' };
    }
  }

  const signatureMessage = buildMessageSignatureMessage({
    conversationId: conversation._id.toString(),
    clientMessageId: body.clientMessageId,
    senderId: sender._id.toString(),
    recipientId: recipient._id.toString(),
    encryptionVersion: MESSENGER_ENCRYPTION_VERSION,
    senderKeyVersion: senderKey.derivationVersion,
    recipientKeyVersion: recipientKey.derivationVersion,
    senderSigningPublicKey: senderKey.signingPublicKey,
    senderEncryptionPublicKey: senderKey.encryptionPublicKey,
    recipientEncryptionPublicKey: recipientKey.encryptionPublicKey,
    contentCiphertext: body.contentCiphertext,
    contentNonce: body.contentNonce,
    senderEncryptedMessageKey: body.senderEncryptedMessageKey,
    recipientEncryptedMessageKey: body.recipientEncryptedMessageKey,
    replyToMessageId: body.replyToMessageId,
    bounty: body.bounty ?? null,
  });

  if (!verifyEd25519Signature(senderKey.signingPublicKey, signatureMessage, body.signature)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const createdAt = new Date();
  const recipientUnreadField = conversation.participantA.equals(recipient._id)
    ? 'participantAUnreadCount'
    : 'participantBUnreadCount';
  const sequencedConversation = await Conversation.findOneAndUpdate(
    {
      _id: conversation._id,
      $or: [{ participantA: sender._id }, { participantB: sender._id }],
    },
    {
      $inc: { nextSequence: 1, [recipientUnreadField]: 1 },
      $set: {
        lastMessageAt: createdAt,
        lastMessageSender: sender._id,
        lastMessageClientMessageId: body.clientMessageId,
      },
    },
    { new: false, session },
  ).exec();

  if (!sequencedConversation) {
    return { ok: false, reason: 'conversation_not_found' };
  }

  const createdMessages = await Message.create(
    [
      {
        conversation: conversation._id,
        sequence: sequencedConversation.nextSequence,
        clientMessageId: body.clientMessageId,
        sender: sender._id,
        recipient: recipient._id,
        encryptionVersion: MESSENGER_ENCRYPTION_VERSION,
        signatureVersion: MESSENGER_SIGNATURE_VERSION,
        senderKeyVersion: senderKey.derivationVersion,
        recipientKeyVersion: recipientKey.derivationVersion,
        senderSigningPublicKey: senderKey.signingPublicKey,
        senderEncryptionPublicKey: senderKey.encryptionPublicKey,
        recipientEncryptionPublicKey: recipientKey.encryptionPublicKey,
        contentCiphertext: body.contentCiphertext,
        contentNonce: body.contentNonce,
        senderEncryptedMessageKey: body.senderEncryptedMessageKey,
        recipientEncryptedMessageKey: body.recipientEncryptedMessageKey,
        replyToMessage: body.replyToMessageId,
        bountyAssetCode: body.bounty?.assetCode ?? null,
        bountyAmount: body.bounty?.amount ?? null,
        bountyDurationSeconds: body.bounty?.durationSeconds ?? null,
        signature: body.signature,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    { session },
  );
  const createdMessage = createdMessages[0];

  if (!createdMessage) {
    throw new Error('Message could not be created');
  }

  let createdBounty: MessageBountyDocument | null = null;

  if (body.bounty) {
    const expiresAt = new Date(createdAt.getTime() + body.bounty.durationSeconds * 1_000);
    const createdBounties = await MessageBounty.create(
      [
        {
          message: createdMessage._id,
          conversation: conversation._id,
          sponsor: sender._id,
          beneficiary: recipient._id,
          assetCode: body.bounty.assetCode,
          amount: body.bounty.amount,
          durationSeconds: body.bounty.durationSeconds,
          status: 'offered',
          expiresAt,
          createdAt,
          updatedAt: createdAt,
        },
      ],
      { session },
    );
    createdBounty = createdBounties[0] ?? null;

    if (!createdBounty) {
      throw new Error('Message bounty could not be created');
    }
  }

  return {
    ok: true,
    message: serializeSentMessage(createdMessage, createdBounty),
    created: true,
  };
};

const sendMessage = async (
  senderId: string,
  conversationId: string,
  body: SendMessageBody,
): Promise<SendMessageResult> => {
  try {
    return await withDatabaseTransaction((session) =>
      sendMessageInTransaction(senderId, conversationId, body, session),
    );
  } catch (error: unknown) {
    if (!isMongoDuplicateKeyError(error)) {
      throw error;
    }

    const existingMessage = await Message.findOne({
      sender: senderId,
      clientMessageId: body.clientMessageId,
    }).exec();

    if (!existingMessage) {
      return { ok: false, reason: 'message_conflict' };
    }

    return idempotentResult(existingMessage, conversationId, senderId, body);
  }
};

export default sendMessage;
export type { SendMessageFailureReason, SendMessageResult, SentMessage };
