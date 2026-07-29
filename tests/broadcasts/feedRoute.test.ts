import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../src/app';
import AuthSession from '../../src/models/AuthSession';
import signAccessToken from '../../src/utils/auth/signAccessToken';
import getBroadcastFeed from '../../src/utils/broadcast/getBroadcastFeed';

vi.mock('../../src/utils/broadcast/getBroadcastFeed', () => ({ default: vi.fn() }));

const getBroadcastFeedMock = vi.mocked(getBroadcastFeed);
const userId = new Types.ObjectId();
const sessionId = new Types.ObjectId();
const accessToken = signAccessToken(
  { id: userId, role: 'user' },
  sessionId,
);

describe('GET /v1/broadcasts/feed', () => {
  beforeEach(() => {
    getBroadcastFeedMock.mockReset();
    vi.spyOn(AuthSession, 'exists').mockResolvedValue({ _id: sessionId });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to received and serializes published timestamps', async () => {
    getBroadcastFeedMock.mockResolvedValue({
      ok: true,
      feed: {
        view: 'received',
        items: [
          {
            id: '507f1f77bcf86cd799439099',
            clientBroadcastId: '2f2b1762-f0f5-4b1b-8acd-70afcf043365',
            creator: {
              id: '507f1f77bcf86cd799439010',
              username: 'creator_user',
              avatar: null,
            },
            manifest: {
              signatureVersion: 1,
              encryptionVersion: 1,
              contentSuite: 'XCHACHA20-POLY1305-IETF',
              keyWrapSuite: 'X25519-XSALSA20-POLY1305-SEALEDBOX',
              creatorId: '507f1f77bcf86cd799439010',
              creatorKeyVersion: 1,
              contentCiphertext: Buffer.alloc(32, 1).toString('base64'),
              contentNonce: Buffer.alloc(24, 2).toString('base64'),
              creatorEncryptedBroadcastKey: Buffer.alloc(80, 3).toString('base64'),
              audienceType: 'demo_all_users',
              audienceCount: 1,
              recipientKeysDigest: 'a'.repeat(64),
            },
            viewerKey: {
              source: 'recipient',
              keyVersion: 1,
              encryptedBroadcastKey: Buffer.alloc(80, 4).toString('base64'),
            },
            integrity: {
              algorithm: 'Ed25519',
              signingPublicKey: Buffer.alloc(32, 5).toString('base64'),
              signature: Buffer.alloc(64, 6).toString('base64'),
            },
            publishedAt: new Date('2026-07-27T12:00:00.000Z'),
          },
        ],
        nextCursor: null,
        hasMore: false,
      },
    });

    const response = await request(app)
      .get('/v1/broadcasts/feed')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.result.feed.items[0].publishedAt).toBe('2026-07-27T12:00:00.000Z');
    expect(getBroadcastFeedMock).toHaveBeenCalledWith(userId.toString(), {
      view: 'received',
      limit: 20,
    });
  });

  it('accepts sent view and cursor while rejecting unknown parameters', async () => {
    const invalid = await request(app)
      .get('/v1/broadcasts/feed')
      .query({ view: 'sent', unknown: 'value' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(invalid.status).toBe(400);
    expect(invalid.body.result.code).toBe('VALIDATION_ERROR');
    expect(getBroadcastFeedMock).not.toHaveBeenCalled();
  });
});
