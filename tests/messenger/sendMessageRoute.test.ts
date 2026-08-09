import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import sendMessage from '../../src/utils/messenger/sendMessage';
import signAccessToken from '../../src/utils/auth/signAccessToken';

vi.mock('../../src/utils/messenger/sendMessage', () => ({ default: vi.fn() }));

const sendMessageMock = vi.mocked(sendMessage);

const userId = new Types.ObjectId();

const recipientId = new Types.ObjectId();

const conversationId = new Types.ObjectId();

const messageId = new Types.ObjectId();

const sessionId = new Types.ObjectId();

const accessToken = signAccessToken({ id: userId, role: 'user' }, sessionId);

const validBody = () => ({
  clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
  contentCiphertext: Buffer.alloc(32, 1).toString('base64'),
  contentNonce: Buffer.alloc(24, 2).toString('base64'),
  senderEncryptedMessageKey: Buffer.alloc(80, 3).toString('base64'),
  recipientEncryptedMessageKey: Buffer.alloc(80, 4).toString('base64'),
  replyToMessageId: null,
  signature: Buffer.alloc(64, 5).toString('base64'),
});

describe('POST /v1/messenger/conversations/:conversationId/messages', () => {
  beforeEach(() => {
    sendMessageMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
  });

  it('accepts a strictly encrypted message envelope', async () => {
    const requestBody = validBody();
    sendMessageMock.mockResolvedValue({
      ok: true,
      created: true,
      message: {
        id: messageId.toString(),
        conversationId: conversationId.toString(),
        sequence: 1,
        clientMessageId: requestBody.clientMessageId,
        senderId: userId.toString(),
        recipientId: recipientId.toString(),
        replyToMessageId: null,
        bounty: null,
        createdAt: new Date('2026-08-07T12:00:00.000Z'),
      },
    });

    const response = await request(app)
      .post(`/v1/messenger/conversations/${conversationId.toString()}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(requestBody);

    expect(response.status).toBe(201);
    expect(response.body.result.message).toMatchObject({
      id: messageId.toString(),
      sequence: 1,
      createdAt: '2026-08-07T12:00:00.000Z',
    });
    expect(sendMessageMock).toHaveBeenCalledWith(userId.toString(), conversationId.toString(), {
      ...requestBody,
      bounty: null,
    });
  });

  it('rejects plaintext, private keys, raw content keys, and server-owned identity fields', async () => {
    const response = await request(app)
      .post(`/v1/messenger/conversations/${conversationId.toString()}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        ...validBody(),
        plaintext: 'secret',
        privateKey: 'secret',
        contentKey: Buffer.alloc(32, 6).toString('base64'),
        senderId: userId.toString(),
        recipientId: recipientId.toString(),
        keyVersion: 99,
      });

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('returns a stable conflict when a UUID is reused for different encrypted content', async () => {
    sendMessageMock.mockResolvedValue({ ok: false, reason: 'message_conflict' });

    const response = await request(app)
      .post(`/v1/messenger/conversations/${conversationId.toString()}/messages`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validBody());

    expect(response.status).toBe(409);
    expect(response.body.result.code).toBe('MESSAGE_ID_CONFLICT');
  });
});
