import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import purchaseUserToken from '../../src/utils/token/purchaseUserToken';

vi.mock('../../src/utils/token/purchaseUserToken', () => ({ default: vi.fn() }));

const userId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const conversationId = new Types.ObjectId();
const token = signAccessToken({ id: userId, role: 'user' }, sessionId);
const purchaseUserTokenMock = vi.mocked(purchaseUserToken);

describe('POST /v1/users/:username/token/purchase', () => {
  beforeEach(() => {
    purchaseUserTokenMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
  });

  it('returns the conversation ensured by a new token holding', async () => {
    purchaseUserTokenMock.mockResolvedValue({
      ok: true,
      created: true,
      holding: {
        tokenId: new Types.ObjectId().toString(),
        ownerId: new Types.ObjectId().toString(),
        ownerUsername: 'token_owner',
        acquiredAt: new Date('2026-08-07T12:00:00.000Z'),
      },
      conversation: { id: conversationId.toString(), created: true },
    });

    const response = await request(app)
      .post('/v1/users/token_owner/token/purchase')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(201);
    expect(response.body.result.conversation).toEqual({
      id: conversationId.toString(),
      created: true,
    });
  });

  it('returns the same conversation for an idempotent repeated purchase', async () => {
    purchaseUserTokenMock.mockResolvedValue({
      ok: true,
      created: false,
      holding: {
        tokenId: new Types.ObjectId().toString(),
        ownerId: new Types.ObjectId().toString(),
        ownerUsername: 'token_owner',
        acquiredAt: new Date('2026-08-07T12:00:00.000Z'),
      },
      conversation: { id: conversationId.toString(), created: false },
    });

    const response = await request(app)
      .post('/v1/users/token_owner/token/purchase')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.result.conversation.id).toBe(conversationId.toString());
  });
});
