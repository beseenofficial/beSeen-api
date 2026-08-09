import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import getMessageHistory from '../../src/utils/messenger/getMessageHistory';

vi.mock('../../src/utils/messenger/getMessageHistory', () => ({ default: vi.fn() }));

const getMessageHistoryMock = vi.mocked(getMessageHistory);
const userId = new Types.ObjectId();
const recipientId = new Types.ObjectId();
const conversationId = new Types.ObjectId();
const messageId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const accessToken = signAccessToken({ id: userId, role: 'user' }, sessionId);

describe('GET /v1/messenger/conversations/:conversationId/messages', () => {
  beforeEach(() => {
    getMessageHistoryMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId } as never);
  });

  it('returns serialized encrypted history without plaintext', async () => {
    getMessageHistoryMock.mockResolvedValue({
      ok: true,
      history: {
        items: [
          {
            id: messageId.toString(),
            sequence: 3,
            manifest: {
              signatureVersion: 1,
              encryptionVersion: 1,
              contentSuite: 'XCHACHA20-POLY1305-IETF',
              keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
              conversationId: conversationId.toString(),
              clientMessageId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
              senderId: userId.toString(),
              recipientId: recipientId.toString(),
              senderKeyVersion: 1,
              recipientKeyVersion: 1,
              senderSigningPublicKey: Buffer.alloc(32, 1).toString('base64'),
              senderEncryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
              recipientEncryptionPublicKey: Buffer.alloc(32, 3).toString('base64'),
              contentCiphertext: Buffer.alloc(32, 4).toString('base64'),
              contentNonce: Buffer.alloc(24, 5).toString('base64'),
              senderEncryptedMessageKey: Buffer.alloc(80, 6).toString('base64'),
              recipientEncryptedMessageKey: Buffer.alloc(80, 7).toString('base64'),
              replyToMessageId: null,
            },
            viewerKey: {
              source: 'sender',
              keyVersion: 1,
              encryptionPublicKey: Buffer.alloc(32, 2).toString('base64'),
              encryptedMessageKey: Buffer.alloc(80, 6).toString('base64'),
            },
            integrity: {
              algorithm: 'Ed25519',
              signingPublicKey: Buffer.alloc(32, 1).toString('base64'),
              signature: Buffer.alloc(64, 8).toString('base64'),
            },
            createdAt: new Date('2026-08-07T12:00:00.000Z'),
          },
        ],
        nextBeforeSequence: null,
        hasMore: false,
      },
    });

    const response = await request(app)
      .get(`/v1/messenger/conversations/${conversationId.toString()}/messages?limit=20`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.result.history.items[0]).toMatchObject({
      sequence: 3,
      createdAt: '2026-08-07T12:00:00.000Z',
      viewerKey: { source: 'sender' },
    });
    expect(response.body.result.history.items[0]).not.toHaveProperty('plaintext');
    expect(getMessageHistoryMock).toHaveBeenCalledWith(
      userId.toString(),
      conversationId.toString(),
      { limit: 20 },
    );
  });

  it('rejects invalid pagination without querying messages', async () => {
    const response = await request(app)
      .get(`/v1/messenger/conversations/${conversationId.toString()}/messages?beforeSequence=1`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.result.code).toBe('VALIDATION_ERROR');
    expect(getMessageHistoryMock).not.toHaveBeenCalled();
  });
});
