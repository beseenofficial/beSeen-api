import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Conversation from '../../src/models/Conversation';
import User from '../../src/models/User';
import getConversations from '../../src/utils/messenger/getConversations';
import { encodeConversationCursor } from '../../src/utils/messenger/conversationCursor';

const walletAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';
const queryResult = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });
const listResult = (value: unknown) => ({
  sort: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

const createUser = (id: Types.ObjectId, username: string) =>
  new User({ _id: id, walletAddress, username, avatar: null });

describe('getConversations', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a cursor page with only the other participant profile', async () => {
    const viewer = createUser(new Types.ObjectId(), 'viewer_user');
    const firstOther = createUser(new Types.ObjectId(), 'first_user');
    const secondOther = createUser(new Types.ObjectId(), 'second_user');
    const firstConversation = new Conversation({
      participantA: viewer._id,
      participantB: firstOther._id,
    });
    const secondConversation = new Conversation({
      participantA: secondOther._id,
      participantB: viewer._id,
    });
    const extraConversation = new Conversation({
      participantA: viewer._id,
      participantB: new Types.ObjectId(),
    });
    firstConversation.createdAt = new Date('2026-08-07T12:00:00.000Z');
    firstConversation.lastMessageAt = new Date('2026-08-07T12:30:00.000Z');
    firstConversation.lastMessageSender = firstOther._id;
    firstConversation.lastMessageClientMessageId = '2f2b1762-f0f5-4b1b-8acd-70afcf043365';
    firstConversation.nextSequence = 4;
    if (firstConversation.participantA.equals(viewer._id)) {
      firstConversation.participantAUnreadCount = 2;
    } else {
      firstConversation.participantBUnreadCount = 2;
    }
    secondConversation.createdAt = new Date('2026-08-07T11:00:00.000Z');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(viewer) as never);
    vi.spyOn(Conversation, 'find').mockReturnValue(
      listResult([firstConversation, secondConversation, extraConversation]) as never,
    );
    vi.spyOn(User, 'find').mockReturnValue(queryResult([firstOther, secondOther]) as never);

    const result = await getConversations(viewer._id.toString(), { limit: 2 });

    expect(result).toMatchObject({
      ok: true,
      conversations: {
        hasMore: true,
        nextCursor: encodeConversationCursor({
          lastMessageAt: null,
          id: secondConversation._id.toString(),
        }),
        items: [
          {
            id: firstConversation._id.toString(),
            otherParticipant: { username: 'first_user' },
            unreadCount: 2,
            lastMessage: {
              sequence: 3,
              senderId: firstOther._id.toString(),
            },
          },
          {
            id: secondConversation._id.toString(),
            otherParticipant: { username: 'second_user' },
            unreadCount: 0,
            lastMessage: null,
          },
        ],
      },
    });
    expect(Conversation.find).toHaveBeenCalledWith({
      $or: [{ participantA: viewer._id }, { participantB: viewer._id }],
    });
    expect(result).not.toHaveProperty('conversations.items.0.otherParticipant.walletAddress');
  });
});
