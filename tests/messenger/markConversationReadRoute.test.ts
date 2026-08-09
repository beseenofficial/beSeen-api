import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import markConversationRead from '../../src/utils/messenger/markConversationRead';

vi.mock('../../src/utils/messenger/markConversationRead', () => ({ default: vi.fn() }));

const markConversationReadMock = vi.mocked(markConversationRead);

const userId = new Types.ObjectId();

const conversationId = new Types.ObjectId();

const sessionId = new Types.ObjectId();

const accessToken = signAccessToken({ id: userId, role: 'user' }, sessionId);

describe('PUT /v1/messenger/conversations/:conversationId/read', () => {
  beforeEach(() => {
    markConversationReadMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
  });

  it('marks the conversation read through one sequence', async () => {
    markConversationReadMock.mockResolvedValue({
      ok: true,
      updated: true,
      readState: {
        conversationId: conversationId.toString(),
        readSequence: 7,
        unreadCount: 0,
      },
    });

    const response = await request(app)
      .put(`/v1/messenger/conversations/${conversationId.toString()}/read`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ throughSequence: 7 });

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({
      updated: true,
      readState: {
        conversationId: conversationId.toString(),
        readSequence: 7,
        unreadCount: 0,
      },
    });
    expect(markConversationReadMock).toHaveBeenCalledWith(
      userId.toString(),
      conversationId.toString(),
      7,
    );
  });

  it('rejects invalid sequences and unknown fields', async () => {
    const response = await request(app)
      .put(`/v1/messenger/conversations/${conversationId.toString()}/read`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ throughSequence: 0, seen: true });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(markConversationReadMock).not.toHaveBeenCalled();
  });

  it('returns a stable error for a sequence beyond the conversation', async () => {
    markConversationReadMock.mockResolvedValue({
      ok: false,
      reason: 'read_sequence_not_found',
    });

    const response = await request(app)
      .put(`/v1/messenger/conversations/${conversationId.toString()}/read`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ throughSequence: 99 });

    expect(response.status).toBe(409);
    expect(response.body.result.code).toBe('READ_SEQUENCE_NOT_FOUND');
  });
});
