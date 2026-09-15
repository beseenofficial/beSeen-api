import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import Conversation from '../../src/models/Conversation';
import getConversationAccess from '../../src/utils/messenger/getConversationAccess';
import hasAuraConversationAccess from '../../src/utils/aura/hasAuraConversationAccess';

vi.mock('../../src/utils/aura/hasAuraConversationAccess', () => ({ default: vi.fn() }));

const hasAuraAccessMock = vi.mocked(hasAuraConversationAccess);

const walletAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const queryResult = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

const createUser = (id: Types.ObjectId, username: string) =>
  new User({ _id: id, walletAddress, username, avatar: null });

describe('getConversationAccess', () => {
  beforeEach(() => hasAuraAccessMock.mockResolvedValue(true));
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns both participants only when the viewer belongs to the conversation', async () => {
    const viewer = createUser(new Types.ObjectId(), 'viewer_user');

    const otherParticipant = createUser(new Types.ObjectId(), 'other_user');

    const conversation = new Conversation({
      participantA: viewer._id,
      participantB: otherParticipant._id,
    });
    vi.spyOn(User, 'findOne')
      .mockReturnValueOnce(queryResult(viewer) as never)
      .mockReturnValueOnce(queryResult(otherParticipant) as never);
    const conversationSpy = vi
      .spyOn(Conversation, 'findOne')
      .mockReturnValue(queryResult(conversation) as never);

    const result = await getConversationAccess(viewer._id.toString(), conversation._id.toString());

    expect(result).toEqual({ ok: true, conversation, viewer, otherParticipant });
    expect(conversationSpy).toHaveBeenCalledWith({
      _id: conversation._id.toString(),
      $or: [{ participantA: viewer._id }, { participantB: viewer._id }],
    });
  });

  it('does not reveal whether a non-participant conversation exists', async () => {
    const viewer = createUser(new Types.ObjectId(), 'viewer_user');
    vi.spyOn(User, 'findOne').mockReturnValue(queryResult(viewer) as never);
    vi.spyOn(Conversation, 'findOne').mockReturnValue(queryResult(null) as never);

    await expect(
      getConversationAccess(viewer._id.toString(), new Types.ObjectId().toString()),
    ).resolves.toEqual({ ok: false, reason: 'conversation_not_found' });
  });

  it('does not expose an old conversation without a confirmed Aura relationship', async () => {
    const viewer = createUser(new Types.ObjectId(), 'viewer_user');
    const otherParticipant = createUser(new Types.ObjectId(), 'other_user');
    const conversation = new Conversation({
      participantA: viewer._id,
      participantB: otherParticipant._id,
    });
    vi.spyOn(User, 'findOne').mockReturnValueOnce(queryResult(viewer) as never);
    vi.spyOn(Conversation, 'findOne').mockReturnValue(queryResult(conversation) as never);
    hasAuraAccessMock.mockResolvedValue(false);

    await expect(
      getConversationAccess(viewer._id.toString(), conversation._id.toString()),
    ).resolves.toEqual({ ok: false, reason: 'conversation_not_found' });
  });
});
