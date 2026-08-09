import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import Conversation from '../../src/models/Conversation';
import { MESSENGER_INITIAL_SEQUENCE } from '../../src/constant/messenger';

const participantA = new Types.ObjectId('000000000000000000000001');

const participantB = new Types.ObjectId('000000000000000000000002');

describe('Conversation model', () => {
  it('canonicalizes a user pair and initializes empty message state', async () => {
    const conversation = new Conversation({
      participantA: participantB,
      participantB: participantA,
    });

    await conversation.validate();

    expect(conversation.participantA.equals(participantA)).toBe(true);
    expect(conversation.participantB.equals(participantB)).toBe(true);
    expect(conversation.nextSequence).toBe(MESSENGER_INITIAL_SEQUENCE);
    expect(conversation.lastMessageAt).toBeNull();
    expect(conversation.lastMessageSender).toBeNull();
    expect(conversation.lastMessageClientMessageId).toBeNull();
    expect(conversation.participantAReadSequence).toBe(0);
    expect(conversation.participantBReadSequence).toBe(0);
    expect(conversation.participantAUnreadCount).toBe(0);
    expect(conversation.participantBUnreadCount).toBe(0);
  });

  it('defines one unique conversation for an unordered user pair', () => {
    expect(Conversation.schema.indexes()).toEqual(
      expect.arrayContaining([
        [
          { participantA: 1, participantB: 1 },
          expect.objectContaining({
            unique: true,
            name: 'conversations_participant_pair_unique',
          }),
        ],
        [
          { participantA: 1, lastMessageAt: -1, _id: -1 },
          expect.objectContaining({ name: 'conversations_participant_a_activity' }),
        ],
        [
          { participantB: 1, lastMessageAt: -1, _id: -1 },
          expect.objectContaining({ name: 'conversations_participant_b_activity' }),
        ],
      ]),
    );
  });

  it('rejects a self-conversation', async () => {
    const conversation = new Conversation({
      participantA,
      participantB: participantA,
    });

    await expect(conversation.validate()).rejects.toThrow(
      'A conversation requires two different users',
    );
  });

  it('throws instead of storing undeclared access or message fields', () => {
    expect(
      () =>
        new Conversation({
          participantA,
          participantB,
          messengerToken: 'not-allowed',
        }),
    ).toThrow();
    expect(
      () =>
        new Conversation({
          participantA,
          participantB,
          plaintext: 'not-allowed',
        }),
    ).toThrow();
  });
});
