import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import User from '../../src/models/User';
import UserKey from '../../src/models/UserKey';
import Conversation from '../../src/models/Conversation';
import getConversationAccess from '../../src/utils/messenger/getConversationAccess';
import getConversationContext from '../../src/utils/messenger/getConversationContext';

vi.mock('../../src/utils/messenger/getConversationAccess', () => ({ default: vi.fn() }));

const getConversationAccessMock = vi.mocked(getConversationAccess);

const walletAddress = 'GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR';

const queryResult = (value: unknown) => ({ exec: vi.fn().mockResolvedValue(value) });

describe('getConversationContext', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getConversationAccessMock.mockReset();
  });

  it('returns active public keys only for the two participants', async () => {
    const viewer = new User({
      _id: new Types.ObjectId(),
      walletAddress,
      username: 'viewer_user',
      avatar: null,
    });

    const otherParticipant = new User({
      _id: new Types.ObjectId(),
      walletAddress,
      username: 'other_user',
      avatar: null,
    });

    const conversation = new Conversation({
      participantA: viewer._id,
      participantB: otherParticipant._id,
    });
    getConversationAccessMock.mockResolvedValue({
      ok: true,
      conversation,
      viewer,
      otherParticipant,
    });
    vi.spyOn(UserKey, 'findOne')
      .mockReturnValueOnce(
        queryResult({
          derivationVersion: 1,
          signingPublicKey: Buffer.alloc(32, 1).toString('base64'),
          encryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
        }) as never,
      )
      .mockReturnValueOnce(
        queryResult({
          derivationVersion: 1,
          signingPublicKey: Buffer.alloc(32, 3).toString('base64'),
          encryptionPublicKey: Buffer.alloc(32, 4).toString('base64'),
        }) as never,
      );

    const result = await getConversationContext(viewer._id.toString(), conversation._id.toString());

    expect(result).toMatchObject({
      ok: true,
      context: {
        conversationId: conversation._id.toString(),
        viewer: { id: viewer._id.toString(), keyVersion: 1 },
        otherParticipant: { id: otherParticipant._id.toString(), keyVersion: 1 },
      },
    });
    expect(result).not.toHaveProperty('context.viewer.walletAddress');
    expect(result).not.toHaveProperty('context.viewer.privateKey');
  });

  it('fails when either participant lacks active keys', async () => {
    const viewer = new User({ _id: new Types.ObjectId(), walletAddress, username: 'viewer_user' });

    const otherParticipant = new User({
      _id: new Types.ObjectId(),
      walletAddress,
      username: 'other_user',
    });

    const conversation = new Conversation({
      participantA: viewer._id,
      participantB: otherParticipant._id,
    });
    getConversationAccessMock.mockResolvedValue({
      ok: true,
      conversation,
      viewer,
      otherParticipant,
    });
    vi.spyOn(UserKey, 'findOne')
      .mockReturnValueOnce(queryResult({ derivationVersion: 1 }) as never)
      .mockReturnValueOnce(queryResult(null) as never);

    await expect(
      getConversationContext(viewer._id.toString(), conversation._id.toString()),
    ).resolves.toEqual({ ok: false, reason: 'active_keys_not_found' });
  });
});
