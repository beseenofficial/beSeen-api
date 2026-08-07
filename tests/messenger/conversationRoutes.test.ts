import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import getConversation from '../../src/utils/messenger/getConversation';
import getConversationContext from '../../src/utils/messenger/getConversationContext';
import getConversations from '../../src/utils/messenger/getConversations';

vi.mock('../../src/utils/messenger/getConversation', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/messenger/getConversationContext', () => ({ default: vi.fn() }));
vi.mock('../../src/utils/messenger/getConversations', () => ({ default: vi.fn() }));

const getConversationMock = vi.mocked(getConversation);
const getConversationContextMock = vi.mocked(getConversationContext);
const getConversationsMock = vi.mocked(getConversations);
const userId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const conversationId = new Types.ObjectId();
const otherUserId = new Types.ObjectId();
const accessToken = signAccessToken({ id: userId, role: 'user' }, sessionId);

describe('Messenger conversation routes', () => {
  beforeEach(() => {
    getConversationMock.mockReset();
    getConversationContextMock.mockReset();
    getConversationsMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
  });

  it('lists only the authenticated user conversations with serialized dates', async () => {
    getConversationsMock.mockResolvedValue({
      ok: true,
      conversations: {
        items: [
          {
            id: conversationId.toString(),
            otherParticipant: { id: otherUserId.toString(), username: 'other_user', avatar: null },
            lastMessageAt: null,
            createdAt: new Date('2026-08-07T12:00:00.000Z'),
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
    });

    const response = await request(app)
      .get('/v1/messenger/conversations')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.result.conversations.items[0]).toMatchObject({
      id: conversationId.toString(),
      lastMessageAt: null,
      createdAt: '2026-08-07T12:00:00.000Z',
    });
    expect(getConversationsMock).toHaveBeenCalledWith(userId.toString(), { limit: 20 });
  });

  it('returns a stable not-found response for inaccessible conversations', async () => {
    getConversationMock.mockResolvedValue({ ok: false, reason: 'conversation_not_found' });

    const response = await request(app)
      .get(`/v1/messenger/conversations/${conversationId.toString()}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.result.code).toBe('CONVERSATION_NOT_FOUND');
  });

  it('returns public encryption context without wallet or private-key data', async () => {
    getConversationContextMock.mockResolvedValue({
      ok: true,
      context: {
        conversationId: conversationId.toString(),
        viewer: {
          id: userId.toString(),
          username: 'viewer_user',
          avatar: null,
          keyVersion: 1,
          signingPublicKey: Buffer.alloc(32, 1).toString('base64'),
          encryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
        },
        otherParticipant: {
          id: otherUserId.toString(),
          username: 'other_user',
          avatar: null,
          keyVersion: 1,
          signingPublicKey: Buffer.alloc(32, 3).toString('base64'),
          encryptionPublicKey: Buffer.alloc(32, 4).toString('base64'),
        },
      },
    });

    const response = await request(app)
      .get(`/v1/messenger/conversations/${conversationId.toString()}/context`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.result.context).not.toHaveProperty('viewer.walletAddress');
    expect(response.body.result.context).not.toHaveProperty('viewer.privateKey');
  });
});
