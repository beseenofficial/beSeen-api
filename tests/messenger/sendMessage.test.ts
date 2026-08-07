import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withDatabaseTransaction } from '../../src/db';
import Conversation from '../../src/models/Conversation';
import Message from '../../src/models/Message';
import MessageBounty from '../../src/models/MessageBounty';
import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import verifyEd25519Signature from '../../src/utils/crypto/verifyEd25519Signature';
import buildMessageSignatureMessage from '../../src/utils/messenger/buildMessageSignatureMessage';
import resolveReplyBounty from '../../src/utils/messenger/resolveReplyBounty';
import sendMessage from '../../src/utils/messenger/sendMessage';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));
vi.mock('../../src/utils/crypto/verifyEd25519Signature', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/messenger/resolveReplyBounty', () => ({ default: vi.fn() }));

const transactionMock = vi.mocked(withDatabaseTransaction);
const verifySignatureMock = vi.mocked(verifyEd25519Signature);
const resolveReplyBountyMock = vi.mocked(resolveReplyBounty);
const senderId = new Types.ObjectId('000000000000000000000001');
const recipientId = new Types.ObjectId('000000000000000000000002');
const conversationId = new Types.ObjectId('000000000000000000000003');
const session = {} as never;
const senderSigningPublicKey = Buffer.alloc(32, 1).toString('base64');
const senderEncryptionPublicKey = Buffer.alloc(32, 2).toString('base64');
const recipientEncryptionPublicKey = Buffer.alloc(32, 3).toString('base64');
const createdAt = new Date('2026-08-07T12:00:00.000Z');

const body = () => ({
  clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
  contentCiphertext: Buffer.alloc(32, 4).toString('base64'),
  contentNonce: Buffer.alloc(24, 5).toString('base64'),
  senderEncryptedMessageKey: Buffer.alloc(80, 6).toString('base64'),
  recipientEncryptedMessageKey: Buffer.alloc(80, 7).toString('base64'),
  replyToMessageId: null,
  signature: Buffer.alloc(64, 8).toString('base64'),
});

const sessionQuery = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

const setupNewMessageReads = () => {
  vi.spyOn(Message, 'findOne').mockReturnValue(sessionQuery(null) as never);
  vi.spyOn(User, 'findOne')
    .mockReturnValueOnce(sessionQuery({ _id: senderId }) as never)
    .mockReturnValueOnce(sessionQuery({ _id: recipientId }) as never);
  vi.spyOn(Conversation, 'findOne').mockReturnValue(
    sessionQuery({
      _id: conversationId,
      participantA: senderId,
      participantB: recipientId,
    }) as never,
  );
  vi.spyOn(UserKey, 'findOne')
    .mockReturnValueOnce(
      sessionQuery({
        derivationVersion: 1,
        signingPublicKey: senderSigningPublicKey,
        encryptionPublicKey: senderEncryptionPublicKey,
      }) as never,
    )
    .mockReturnValueOnce(
      sessionQuery({
        derivationVersion: 2,
        signingPublicKey: Buffer.alloc(32, 9).toString('base64'),
        encryptionPublicKey: recipientEncryptionPublicKey,
      }) as never,
    );
};

describe('sendMessage', () => {
  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (operation) => operation(session));
    verifySignatureMock.mockReset();
    resolveReplyBountyMock.mockReset();
    resolveReplyBountyMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('verifies the server-owned conversation context and creates the next encrypted message', async () => {
    const replyToMessageId = new Types.ObjectId('000000000000000000000009').toString();
    const requestBody = { ...body(), replyToMessageId };
    setupNewMessageReads();
    vi.spyOn(Message, 'exists').mockReturnValue(sessionQuery({ _id: replyToMessageId }) as never);
    verifySignatureMock.mockReturnValue(true);
    vi.spyOn(Conversation, 'findOneAndUpdate').mockReturnValue(
      execQuery({ nextSequence: 1 }) as never,
    );
    vi.spyOn(Message, 'create').mockImplementation(async (documents) => {
      const input = documents[0] as Record<string, unknown>;

      return [
        new Message({
          ...input,
          _id: new Types.ObjectId('000000000000000000000004'),
          createdAt,
          updatedAt: createdAt,
        }),
      ] as never;
    });

    const result = await sendMessage(senderId.toString(), conversationId.toString(), requestBody);

    expect(result).toMatchObject({
      ok: true,
      created: true,
      message: {
        conversationId: conversationId.toString(),
        sequence: 1,
        senderId: senderId.toString(),
        recipientId: recipientId.toString(),
      },
    });
    const expectedManifest = buildMessageSignatureMessage({
      conversationId: conversationId.toString(),
      clientMessageId: requestBody.clientMessageId,
      senderId: senderId.toString(),
      recipientId: recipientId.toString(),
      encryptionVersion: 1,
      senderKeyVersion: 1,
      recipientKeyVersion: 2,
      senderSigningPublicKey,
      senderEncryptionPublicKey,
      recipientEncryptionPublicKey,
      contentCiphertext: requestBody.contentCiphertext,
      contentNonce: requestBody.contentNonce,
      senderEncryptedMessageKey: requestBody.senderEncryptedMessageKey,
      recipientEncryptedMessageKey: requestBody.recipientEncryptedMessageKey,
      replyToMessageId,
    });
    expect(verifySignatureMock).toHaveBeenCalledWith(
      senderSigningPublicKey,
      expectedManifest,
      requestBody.signature,
    );
    expect(Conversation.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: conversationId }),
      {
        $inc: { nextSequence: 1, participantBUnreadCount: 1 },
        $set: {
          lastMessageAt: expect.any(Date),
          lastMessageSender: senderId,
          lastMessageClientMessageId: requestBody.clientMessageId,
        },
      },
      { new: false, session },
    );
    expect(resolveReplyBountyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId,
        replyToMessageId,
        senderId,
        recipientId,
        session,
      }),
    );
  });

  it('creates an optional signed demo bounty in the same transaction as its message', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(createdAt);
    const requestBody = {
      ...body(),
      bounty: { assetCode: 'USDC', amount: '10', durationSeconds: 3_600 },
    };
    setupNewMessageReads();
    verifySignatureMock.mockReturnValue(true);
    vi.spyOn(Conversation, 'findOneAndUpdate').mockReturnValue(
      execQuery({ nextSequence: 1 }) as never,
    );
    vi.spyOn(Message, 'create').mockImplementation(async (documents) => {
      const input = documents[0] as Record<string, unknown>;

      return [
        new Message({
          ...input,
          _id: new Types.ObjectId('000000000000000000000004'),
          createdAt,
          updatedAt: createdAt,
        }),
      ] as never;
    });
    vi.spyOn(MessageBounty, 'create').mockImplementation(async (documents) => {
      const input = documents[0] as Record<string, unknown>;

      return [
        new MessageBounty({
          ...input,
          _id: new Types.ObjectId('000000000000000000000005'),
          createdAt,
          updatedAt: createdAt,
        }),
      ] as never;
    });

    const result = await sendMessage(senderId.toString(), conversationId.toString(), requestBody);

    expect(result).toMatchObject({
      ok: true,
      created: true,
      message: {
        bounty: {
          assetCode: 'USDC',
          amount: '10',
          durationSeconds: 3_600,
          status: 'offered',
          expiresAt: new Date('2026-08-07T13:00:00.000Z'),
        },
      },
    });
    expect(verifySignatureMock.mock.calls[0]?.[1]).toContain('Bounty Asset Code: USDC');
    expect(verifySignatureMock.mock.calls[0]?.[1]).toContain('Bounty Amount: 10');
    expect(MessageBounty.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          sponsor: senderId,
          beneficiary: recipientId,
          assetCode: 'USDC',
          amount: '10',
          durationSeconds: 3_600,
          status: 'offered',
        }),
      ],
      { session },
    );
  });

  it('rejects an invalid derived-key signature before allocating a sequence', async () => {
    setupNewMessageReads();
    verifySignatureMock.mockReturnValue(false);
    const sequenceSpy = vi.spyOn(Conversation, 'findOneAndUpdate');
    const createSpy = vi.spyOn(Message, 'create');

    await expect(
      sendMessage(senderId.toString(), conversationId.toString(), body()),
    ).resolves.toEqual({ ok: false, reason: 'invalid_signature' });
    expect(sequenceSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('rejects a reply target outside the same conversation', async () => {
    const requestBody = {
      ...body(),
      replyToMessageId: new Types.ObjectId('000000000000000000000009').toString(),
    };
    setupNewMessageReads();
    vi.spyOn(Message, 'exists').mockReturnValue(sessionQuery(null) as never);
    const sequenceSpy = vi.spyOn(Conversation, 'findOneAndUpdate');

    await expect(
      sendMessage(senderId.toString(), conversationId.toString(), requestBody),
    ).resolves.toEqual({ ok: false, reason: 'reply_not_found' });
    expect(verifySignatureMock).not.toHaveBeenCalled();
    expect(sequenceSpy).not.toHaveBeenCalled();
  });

  it('returns an identical retry without creating a second message', async () => {
    const requestBody = body();
    const existing = new Message({
      conversation: conversationId,
      sequence: 4,
      clientMessageId: requestBody.clientMessageId,
      sender: senderId,
      recipient: recipientId,
      senderKeyVersion: 1,
      recipientKeyVersion: 2,
      senderSigningPublicKey,
      senderEncryptionPublicKey,
      recipientEncryptionPublicKey,
      contentCiphertext: requestBody.contentCiphertext,
      contentNonce: requestBody.contentNonce,
      senderEncryptedMessageKey: requestBody.senderEncryptedMessageKey,
      recipientEncryptedMessageKey: requestBody.recipientEncryptedMessageKey,
      signature: requestBody.signature,
      createdAt,
      updatedAt: createdAt,
    });
    vi.spyOn(Message, 'findOne').mockReturnValue(sessionQuery(existing) as never);
    vi.spyOn(MessageBounty, 'findOne').mockReturnValue(sessionQuery(null) as never);
    const sequenceSpy = vi.spyOn(Conversation, 'findOneAndUpdate');

    const result = await sendMessage(senderId.toString(), conversationId.toString(), requestBody);

    expect(result).toMatchObject({ ok: true, created: false, message: { sequence: 4 } });
    expect(sequenceSpy).not.toHaveBeenCalled();
  });

  it('rejects reuse of a client message UUID with different ciphertext', async () => {
    const requestBody = body();
    const existing = new Message({
      conversation: conversationId,
      sequence: 4,
      clientMessageId: requestBody.clientMessageId,
      sender: senderId,
      recipient: recipientId,
      senderKeyVersion: 1,
      recipientKeyVersion: 2,
      senderSigningPublicKey,
      senderEncryptionPublicKey,
      recipientEncryptionPublicKey,
      contentCiphertext: Buffer.alloc(32, 10).toString('base64'),
      contentNonce: requestBody.contentNonce,
      senderEncryptedMessageKey: requestBody.senderEncryptedMessageKey,
      recipientEncryptedMessageKey: requestBody.recipientEncryptedMessageKey,
      signature: requestBody.signature,
      createdAt,
      updatedAt: createdAt,
    });
    vi.spyOn(Message, 'findOne').mockReturnValue(sessionQuery(existing) as never);

    await expect(
      sendMessage(senderId.toString(), conversationId.toString(), requestBody),
    ).resolves.toEqual({ ok: false, reason: 'message_conflict' });
  });
});
