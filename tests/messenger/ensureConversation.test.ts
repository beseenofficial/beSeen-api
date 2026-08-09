import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Conversation from '../../src/models/Conversation';
import ensureConversation, {
  canonicalParticipantPair,
} from '../../src/utils/messenger/ensureConversation';

const lowerId = new Types.ObjectId('000000000000000000000001');

const higherId = new Types.ObjectId('000000000000000000000002');

const session = {} as never;

const updateResult = (upsertedCount: number) => ({
  exec: vi.fn().mockResolvedValue({ upsertedCount }),
});

const findResult = (value: unknown) => ({
  session: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue(value),
});

describe('ensureConversation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('produces the same canonical pair in either direction', () => {
    expect(canonicalParticipantPair(higherId, lowerId)).toEqual({
      participantA: lowerId,
      participantB: higherId,
    });
    expect(canonicalParticipantPair(lowerId, higherId)).toEqual({
      participantA: lowerId,
      participantB: higherId,
    });
  });

  it('upserts and returns a newly created canonical conversation', async () => {
    const conversation = new Conversation({ participantA: lowerId, participantB: higherId });
    vi.spyOn(Conversation, 'updateOne').mockReturnValue(updateResult(1) as never);
    vi.spyOn(Conversation, 'findOne').mockReturnValue(findResult(conversation) as never);

    const result = await ensureConversation(higherId, lowerId, session);

    expect(result).toEqual({ conversation, created: true });
    expect(Conversation.updateOne).toHaveBeenCalledWith(
      { participantA: lowerId, participantB: higherId },
      {
        $setOnInsert: { participantA: lowerId, participantB: higherId },
      },
      { upsert: true, session },
    );
  });

  it('reuses an existing conversation and rejects self-conversations', async () => {
    const conversation = new Conversation({ participantA: lowerId, participantB: higherId });
    vi.spyOn(Conversation, 'updateOne').mockReturnValue(updateResult(0) as never);
    vi.spyOn(Conversation, 'findOne').mockReturnValue(findResult(conversation) as never);

    await expect(ensureConversation(lowerId, higherId, session)).resolves.toEqual({
      conversation,
      created: false,
    });
    await expect(ensureConversation(lowerId, lowerId, session)).rejects.toThrow(
      'A conversation requires two different users',
    );
  });
});
