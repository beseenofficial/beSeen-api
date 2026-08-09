import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import Message from '../../src/models/Message';
import Conversation from '../../src/models/Conversation';
import MessageBounty from '../../src/models/MessageBounty';
import getMessageHistory from '../../src/utils/messenger/getMessageHistory';
import getConversationAccess from '../../src/utils/messenger/getConversationAccess';
import expireOfferedMessageBounties from '../../src/utils/messenger/expireOfferedMessageBounties';

vi.mock('../../src/utils/messenger/getConversationAccess', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/messenger/expireOfferedMessageBounties', () => ({ default: vi.fn() }));

const getConversationAccessMock = vi.mocked(getConversationAccess);

const expireOfferedMessageBountiesMock = vi.mocked(expireOfferedMessageBounties);

const senderId = new Types.ObjectId('000000000000000000000001');

const recipientId = new Types.ObjectId('000000000000000000000002');

const conversationId = new Types.ObjectId('000000000000000000000003');

const walletAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const listResult = (value: unknown) => ({
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const queryResult = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

const createMessage = (sequence: number, sender: Types.ObjectId, recipient: Types.ObjectId) =>
  new Message({
    _id: new Types.ObjectId(),
    conversation: conversationId,
    sequence,
    clientMessageId: `2f2b1762-f0f5-4b1b-8acd-${sequence.toString().padStart(12, '0')}`,
    sender,
    recipient,
    senderKeyVersion: 1,
    recipientKeyVersion: 2,
    senderSigningPublicKey: Buffer.alloc(32, sequence).toString('base64'),
    senderEncryptionPublicKey: Buffer.alloc(32, sequence + 1).toString('base64'),
    recipientEncryptionPublicKey: Buffer.alloc(32, sequence + 2).toString('base64'),
    contentCiphertext: Buffer.alloc(32, sequence + 3).toString('base64'),
    contentNonce: Buffer.alloc(24, sequence + 4).toString('base64'),
    senderEncryptedMessageKey: Buffer.alloc(80, sequence + 5).toString('base64'),
    recipientEncryptedMessageKey: Buffer.alloc(80, sequence + 6).toString('base64'),
    signature: Buffer.alloc(64, sequence + 7).toString('base64'),
    createdAt: new Date(`2026-08-07T12:0${sequence}:00.000Z`),
    updatedAt: new Date(`2026-08-07T12:0${sequence}:00.000Z`),
  });

describe('getMessageHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getConversationAccessMock.mockReset();
    expireOfferedMessageBountiesMock.mockReset();
  });

  it('returns newest-first opaque envelopes with only the viewer decryptable key selected', async () => {
    const viewer = new User({
      _id: senderId,
      walletAddress,
      username: 'sender_user',
    });

    const otherParticipant = new User({
      _id: recipientId,
      walletAddress,
      username: 'recipient_user',
    });

    const conversation = new Conversation({
      _id: conversationId,
      participantA: senderId,
      participantB: recipientId,
      participantAReadSequence: 2,
      participantBReadSequence: 2,
    });

    const sent = createMessage(3, senderId, recipientId);
    sent.bountyAssetCode = 'USDC';
    sent.bountyAmount = '10';
    sent.bountyDurationSeconds = 3_600;
    const received = createMessage(2, recipientId, senderId);

    const extra = createMessage(1, senderId, recipientId);

    const bounty = new MessageBounty({
      message: sent._id,
      conversation: conversationId,
      sponsor: senderId,
      beneficiary: recipientId,
      assetCode: 'USDC',
      amount: '10',
      durationSeconds: 3_600,
      expiresAt: new Date('2026-08-07T13:00:00.000Z'),
    });
    getConversationAccessMock.mockResolvedValue({
      ok: true,
      conversation,
      viewer,
      otherParticipant,
    });
    vi.spyOn(Message, 'find').mockReturnValue(listResult([sent, received, extra]) as never);
    vi.spyOn(MessageBounty, 'find').mockReturnValue(queryResult([bounty]) as never);

    const result = await getMessageHistory(senderId.toString(), conversationId.toString(), {
      limit: 2,
    });

    expect(result).toMatchObject({
      ok: true,
      history: {
        hasMore: true,
        nextBeforeSequence: 2,
        items: [
          {
            sequence: 3,
            viewerKey: {
              source: 'sender',
              encryptedMessageKey: sent.senderEncryptedMessageKey,
            },
            delivery: { seenByRecipient: false },
            manifest: {
              bountyTerms: { assetCode: 'USDC', amount: '10', durationSeconds: 3_600 },
            },
            bounty: {
              assetCode: 'USDC',
              amount: '10',
              status: 'offered',
            },
          },
          {
            sequence: 2,
            viewerKey: {
              source: 'recipient',
              encryptedMessageKey: received.recipientEncryptedMessageKey,
            },
            delivery: { seenByRecipient: true },
          },
        ],
      },
    });
    expect(result).not.toHaveProperty('history.items.0.plaintext');
    expect(result).not.toHaveProperty('history.items.0.privateKey');
    expect(Message.find).toHaveBeenCalledWith({ conversation: conversation._id });
  });

  it('applies the exclusive sequence cursor and hides inaccessible conversations', async () => {
    const conversation = new Conversation({
      _id: conversationId,
      participantA: senderId,
      participantB: recipientId,
    });

    const viewer = new User({ _id: senderId, walletAddress, username: 'sender_user' });

    const otherParticipant = new User({
      _id: recipientId,
      walletAddress,
      username: 'recipient_user',
    });
    getConversationAccessMock.mockResolvedValueOnce({
      ok: true,
      conversation,
      viewer,
      otherParticipant,
    });
    vi.spyOn(Message, 'find').mockReturnValue(listResult([]) as never);

    await getMessageHistory(senderId.toString(), conversationId.toString(), {
      beforeSequence: 8,
      limit: 20,
    });

    expect(Message.find).toHaveBeenCalledWith({
      conversation: conversation._id,
      sequence: { $lt: 8 },
    });

    getConversationAccessMock.mockResolvedValueOnce({
      ok: false,
      reason: 'conversation_not_found',
    });
    await expect(
      getMessageHistory(senderId.toString(), conversationId.toString(), { limit: 20 }),
    ).resolves.toEqual({ ok: false, reason: 'conversation_not_found' });
  });
});
