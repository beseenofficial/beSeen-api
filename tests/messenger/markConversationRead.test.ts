import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withDatabaseTransaction } from '../../src/db';
import Conversation from '../../src/models/Conversation';
import Message from '../../src/models/Message';
import User from '../../src/models/User';
import markConversationRead from '../../src/utils/messenger/markConversationRead';

vi.mock('../../src/db', () => ({ withDatabaseTransaction: vi.fn() }));

const transactionMock = vi.mocked(withDatabaseTransaction);
const participantA = new Types.ObjectId('000000000000000000000001');
const participantB = new Types.ObjectId('000000000000000000000002');
const conversationId = new Types.ObjectId('000000000000000000000003');
const session = {} as never;

const sessionQuery = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const execQuery = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('markConversationRead', () => {
  beforeEach(() => {
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (operation) => operation(session));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('moves the participant cursor forward and atomically recalculates unread messages', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(sessionQuery({ _id: participantB }) as never);
    vi.spyOn(Conversation, 'findOne').mockReturnValue(
      sessionQuery({
        _id: conversationId,
        participantA,
        participantB,
        nextSequence: 6,
        participantAReadSequence: 0,
        participantBReadSequence: 1,
        participantAUnreadCount: 0,
        participantBUnreadCount: 3,
      }) as never,
    );
    vi.spyOn(Message, 'countDocuments').mockReturnValue(sessionQuery(1) as never);
    vi.spyOn(Conversation, 'findOneAndUpdate').mockReturnValue(
      execQuery({
        _id: conversationId,
        participantBReadSequence: 4,
        participantBUnreadCount: 1,
      }) as never,
    );

    const result = await markConversationRead(
      participantB.toString(),
      conversationId.toString(),
      4,
    );

    expect(result).toEqual({
      ok: true,
      updated: true,
      readState: {
        conversationId: conversationId.toString(),
        readSequence: 4,
        unreadCount: 1,
      },
    });
    expect(Message.countDocuments).toHaveBeenCalledWith({
      conversation: conversationId,
      recipient: participantB,
      sequence: { $gt: 4 },
    });
    expect(Conversation.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: conversationId }),
      {
        $set: {
          participantBReadSequence: 4,
          participantBUnreadCount: 1,
        },
      },
      { new: true, session, runValidators: true },
    );
  });

  it('is idempotent and never moves a read cursor backward', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(sessionQuery({ _id: participantA }) as never);
    vi.spyOn(Conversation, 'findOne').mockReturnValue(
      sessionQuery({
        _id: conversationId,
        participantA,
        participantB,
        nextSequence: 6,
        participantAReadSequence: 4,
        participantAUnreadCount: 1,
      }) as never,
    );
    const countSpy = vi.spyOn(Message, 'countDocuments');
    const updateSpy = vi.spyOn(Conversation, 'findOneAndUpdate');

    await expect(
      markConversationRead(participantA.toString(), conversationId.toString(), 2),
    ).resolves.toEqual({
      ok: true,
      updated: false,
      readState: {
        conversationId: conversationId.toString(),
        readSequence: 4,
        unreadCount: 1,
      },
    });
    expect(countSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('rejects a sequence that has not been created', async () => {
    vi.spyOn(User, 'findOne').mockReturnValue(sessionQuery({ _id: participantA }) as never);
    vi.spyOn(Conversation, 'findOne').mockReturnValue(
      sessionQuery({
        _id: conversationId,
        participantA,
        participantB,
        nextSequence: 3,
      }) as never,
    );

    await expect(
      markConversationRead(participantA.toString(), conversationId.toString(), 3),
    ).resolves.toEqual({ ok: false, reason: 'read_sequence_not_found' });
  });
});
